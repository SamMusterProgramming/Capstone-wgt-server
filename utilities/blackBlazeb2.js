import B2 from "backblaze-b2";

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});

const BUCKET_ID = process.env.B2_BUCKET_ID;

export const getSignedUrlFromB2 = async (fileName) => {
  await b2.authorize();

  // Get download authorization
  const response = await b2.getDownloadAuthorization({
    bucketId: BUCKET_ID,
    fileNamePrefix: fileName,
    validDurationInSeconds: 3600, // 1 hour
  });

  const downloadUrl = `${b2.downloadUrl}/file/${process.env.B2_BUCKET_NAME}/${fileName}?Authorization=${response.data.authorizationToken}`;

  return downloadUrl;
};