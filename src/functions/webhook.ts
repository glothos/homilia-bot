import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { callTelegramApi } from '../helpers/callTelegramApi';
import { SNS, DynamoDB } from 'aws-sdk';
import * as uuid from 'uuid';

const sns = new SNS();

const db = new DynamoDB.DocumentClient();

const TableName = process.env.TABLE_NAME || '';

export function getGreetingByTimeOfDay(date: Date): string {
  const hour = date.getHours();

  if (hour < 12) {
    return 'Bom dia';
  } else if (hour < 18) {
    return 'Boa tarde';
  } else {
    return 'Boa noite';
  }
}

export async function sendConfirmationQuestion(fileRefId?: string): Promise<any> {
  // call telegram api send message, with inline keyboard options to confirm or cancel

  const res = await callTelegramApi('sendMessage', 'POST', {
    chat_id: process.env.CHAT_ID,
    text: `${getGreetingByTimeOfDay(
      new Date()
    )}, padre. Nosso Senhor seja louvado! 🙏\nDeseja enviar a homilia para os canais de comunicação?\n\nLembre-se: eu usarei sempre o último audio que foi enviado.`,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Sim',
            callback_data: `${fileRefId}_confirm`,
          },
          {
            text: 'Não',
            callback_data: `${fileRefId}_cancel`,
          },
        ],
      ],
    },
  });

  return res.data;
}

export const sendProcessingMessage = async (messageId: string): Promise<any> => {
  const res = await callTelegramApi('sendMessage', 'POST', {
    chat_id: process.env.CHAT_ID,
    text: `Entendido.👍 Estou processando este áudio.🎵\n\nAguarde um momento... ⏱`,
    reply_to_message_id: messageId,
  });

  return res.data;
};

export const sendCancelConfirmation = async (): Promise<any> => {
  await callTelegramApi('sendMessage', 'POST', {
    chat_id: process.env.CHAT_ID,
    text: `Entendido.👍\n\nA homilia não será enviada para os canais de comunicação.`,
  });
};

export const removeInlineKeyboard = async (inlineMessageId: string): Promise<any> => {
  await callTelegramApi('editMessageReplyMarkup', 'POST', {
    chat_id: process.env.CHAT_ID,
    message_id: inlineMessageId,
    reply_markup: {
      inline_keyboard: [],
    },
  });
};

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const requestData = JSON.parse(event.body || '{}');

    if (requestData.message?.voice) {
      const fileId = requestData.message.voice.file_id;
      const newRef = {
        ID: uuid.v4(),
        fileId,
        messageId: requestData.message.message_id,
      };
      const fileRef = await db
        .put({
          TableName,
          Item: newRef,
        })
        .promise();
      const responseData = await sendConfirmationQuestion(newRef.ID);

      if (responseData.ok) {
        await db
          .put({
            TableName,
            Item: {
              ...newRef,
              inlineMessageId: responseData.result.message_id,
            },
          })
          .promise();
      }

      console.log(fileRef, responseData);
    }

    if (requestData.callback_query) {
      const data = requestData.callback_query.data.split('_');
      const fileRefId = data[0];
      const action = data[1];
      const savedRef = await db
        .get({
          TableName,
          Key: {
            ID: fileRefId,
          },
        })
        .promise();

      if (action === 'confirm') {
        if (savedRef.Item) {
          await removeInlineKeyboard(savedRef.Item.inlineMessageId);
          await sendProcessingMessage(savedRef.Item.messageId);
          // send notification to transcoder function
          await sns
            .publish({
              Message: savedRef.Item?.fileId,
              TopicArn: process.env.TOPIC_ARN,
            })
            .promise();
        }
      }

      if (action === 'cancel') {
        await removeInlineKeyboard(savedRef.Item?.inlineMessageId);
        await db
          .delete({
            TableName,
            Key: {
              ID: fileRefId,
            },
          })
          .promise();
        await sendCancelConfirmation();
      }

      console.log(fileRefId);
    }

    return {
      statusCode: 200,
      body: 'success',
    };
  } catch (e) {
    console.log('ERROR', e);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: e.message,
      }),
    };
  }
};
