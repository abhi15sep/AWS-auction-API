import AWS from "aws-sdk";
import middy from "@middy/core";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import httpEventNormalizer from "@middy/http-event-normalizer";
import httpErrorHandler from "@middy/http-error-handler";
import createError from "http-errors";

const dynamodb = new AWS.DynamoDB.DocumentClient();

// @desc      Get all auctions
// @route     GET /auctions
// @access    Public
async function getAuction(event, context) {
  let auctions;

  try {
    const result = await dynamodb
      .scan({
        TableName: process.env.AUCTIONS_TABLE_NAME,
      })
      .promise();

    auctions = result.Items;
  } catch (error) {
    console.error;
    throw new createError.InternalServerError(error);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(auctions),
  };
}

export const handler = middy(getAuction)
  .use(httpJsonBodyParser()) // Automatically parse stringified event body
  .use(httpEventNormalizer()) // Automatically adjust the API gateway event objects
  .use(httpErrorHandler()); // Helpes hanlding error process
