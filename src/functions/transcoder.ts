import { SNSEvent, SNSEventRecord, SNSHandler } from 'aws-lambda';
import { resolve } from 'path';
import { createWriteStream } from 'fs';
import axios from 'axios';

async function downloadFile(fileId: string): Promise<any> {
  const path = resolve(__dirname, 'tmp', 'file.oga');
  const writer = createWriteStream(path);
  const fileFetch = await axios({
    method: 'GET',
    url: `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_KEY}/${fileId}`,
    responseType: 'stream',
  });
  fileFetch.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      return resolve(path);
    });
    writer.on('error', reject);
  });
}

export const handler: SNSHandler = async (_event: SNSEvent) => {
  const records: SNSEventRecord[] = _event.Records;
  records.forEach(({ Sns }) => console.log(Sns));
  const fileId = records[0].Sns.Message;
  const filePath = await downloadFile(fileId);
  // transform audio in mp3 using ffmpeg layer

  // TODO:
  // upload to s3
  // send message to telegram
  // update rss feed in s3
  // logs success
};
