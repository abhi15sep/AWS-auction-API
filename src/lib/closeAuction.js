import AWS from "aws-sdk";

const dynamodb = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();

export async function closeAuction(auction) {
  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    Key: { id: auction.id },
    UpdateExpression: "set #status = :status",
    ExpressionAttributeValues: {
      ":status": "CLOSED",
    },
    ExpressionAttributeNames: {
      "#status": "status",
    },
  };

  await dynamodb.update(params).promise();

  const { title, seller, highestBid } = auction;
  const { amount, bidder } = highestBid;

  // Notify seller that the item was not sold via email
  if (amount === 0) {
    await sqs
      .sendMessage({
        QueueUrl: process.env.MAIL_QUEUE_URL,
        MessageBody: JSON.stringify({
          subject: "No bids on your auction item :( ",
          recipient: seller,
          body: `Oh no! Your item "${title}" didn't get any bids. It is what it is ¯\_(ツ)_/¯  better luck next time`,
        }),
      })
      .promise();
    return;
  }

  // Notify seller that the item has sold via email
  const notifySeller = sqs
    .sendMessage({
      QueueUrl: process.env.MAIL_QUEUE_URL,
      MessageBody: JSON.stringify({
        subject: "Your item has been sold!",
        recipient: seller,
        body: `Hey ${seller}, your item "${title}" has been old for £${amount}.`,
      }),
    })
    .promise();

  // Notify buyer that they won the auction via email
  const notifyBidder = sqs
    .sendMessage({
      QueueUrl: process.env.MAIL_QUEUE_URL,
      MessageBody: JSON.stringify({
        subject: "You won an auction!",
        recipient: bidder,
        body: `Hey ${bidder}, you win the auction! your got yourself a "${title}" for £${amount}.`,
      }),
    })
    .promise();

  return Promise.all([notifySeller, notifyBidder]);
}
