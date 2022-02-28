import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { callTelegramApi } from '../helpers/callTelegramApi';
import { SNS } from 'aws-sdk';

const sns = new SNS();

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const requestData = JSON.parse(event.body || '{}');

    await sns
      .publish({
        Message: JSON.stringify(requestData),
        TopicArn: process.env.TOPIC_ARN,
      })
      .promise();

    return {
      statusCode: 200,
      body: 'success',
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: e.message,
      }),
    };
  }
};
