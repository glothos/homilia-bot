import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { callTelegramApi } from '../helpers/callTelegramApi';

export async function getMe(): Promise<any> {
  const res = await callTelegramApi('getMe', 'GET');

  return res;
}

export function getChat(id: string): Promise<any> {
  return callTelegramApi(`getChat?chat_id=${id}`, 'GET');
}

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

export async function sendConfirmationQuestion(): Promise<any> {
  const res = await callTelegramApi(`sendMessage`, 'POST', {
    chat_id: process.env.CHAT_ID,
    text: `${getGreetingByTimeOfDay(
      new Date()
    )}, padre. Nosso Senhor seja louvado! 🙏\nDeseja enviar a homilia para os canais de comunicação?\n\nLembre-se: eu usarei sempre o último audio que foi enviado.`,
    reply_markup: {
      keyboard: [
        [
          {
            text: 'Sim',
            callback_data: 'confirm',
          },
          {
            text: 'Não',
            callback_data: 'cancel',
          },
        ],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });

  return res.data;
}

export const handler: APIGatewayProxyHandler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const responseData = await sendConfirmationQuestion();
    console.log(_event);

    return {
      statusCode: 200,
      body: JSON.stringify(responseData),
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: e.message,
        input: _event,
      }),
    };
  }
};
