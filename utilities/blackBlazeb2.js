import B2 from "backblaze-b2";

const b2_PRIVATE = new B2({
  applicationKeyId: process.env.B2_PRIVATE_KEY_ID,
  applicationKey: process.env.B2_PRIVATE_APP_KEY,
});

const b2_PUBLIC = new B2({
  applicationKeyId: process.env.B2_PUBLIC_KEY_ID,
  applicationKey: process.env.B2_PUBLIC_APP_KEY,
});

const BUCKET_PRIVATE_ID = process.env.B2_PRIVATE_BUCKET_ID;
const BUCKET_PUBLIC_ID = process.env.B2_PUBLIC_BUCKET_ID;

export const getUploadPrivateUrl = async () => {
  await b2_PRIVATE.authorize();
  const uploadUrlResponse = await b2_PRIVATE.getUploadUrl({
    bucketId: BUCKET_PRIVATE_ID,
  });
  return uploadUrlResponse;
};

export const getUploadPublicUrl = async () => {
  await b2_PUBLIC.authorize();
  const uploadUrlResponse = await b2_PUBLIC.getUploadUrl({
    bucketId: BUCKET_PUBLIC_ID,
  });
  return uploadUrlResponse;
};

// export const getSignedUrlFromB2 = async (fileName) => {
//   await b2_PRIVATE.authorize();

//   const response = await b2_PRIVATE.getDownloadAuthorization({
//     bucketId: BUCKET_PRIVATE_ID ,
//     fileNamePrefix: fileName,
//     validDurationInSeconds: 3600,
//   });
//   const downloadUrl = `${b2_PRIVATE.downloadUrl}/file/${process.env.B2_PRIVATE_BUCKET_NAME}/${fileName}?Authorization=${response.data.authorizationToken}`;
//   return downloadUrl;
// };

export const getSignedUrlFromB2 = async (fileName) => {
  const authResponse = await b2_PRIVATE.authorize();

  const downloadUrlBase = authResponse.data.downloadUrl;

  const response = await b2_PRIVATE.getDownloadAuthorization({
    bucketId: BUCKET_PRIVATE_ID,
    fileNamePrefix: fileName,
    validDurationInSeconds: 3600,
  });

  const signedUrl =
    `${downloadUrlBase}/file/${process.env.B2_PRIVATE_BUCKET_NAME}/${fileName}` +
    `?Authorization=${response.data.authorizationToken}`;

  return signedUrl;
};

export const getPublicUrlFromB2 = async (fileName) => {
  const auth = await b2_PUBLIC.authorize();
  const downloadUrl = auth.data.downloadUrl;
   const publicUrl = `${downloadUrl}/file/${process.env.B2_PUBLIC_BUCKET_NAME}/${fileName}`;
return publicUrl;
};




export const deleteFileFromB2 = async (fileName, fileId) => {
  await b2_PRIVATE.authorize();
  const response = await b2_PRIVATE.deleteFileVersion({
    fileName,
    fileId,
  });
  return response.data;
};