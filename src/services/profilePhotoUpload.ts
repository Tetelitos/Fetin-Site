import type { User } from "firebase/auth";
import {
  getDownloadURL,
  uploadBytes,
  type StorageReference,
} from "firebase/storage";

type UploadProfilePhotoInput = {
  fileUri: string;
  photoRef: StorageReference;
  user: User;
};

export const uploadProfilePhoto = async ({
  fileUri,
  photoRef,
}: UploadProfilePhotoInput) => {
  const imageResponse = await fetch(fileUri);
  const imageBlob = await imageResponse.blob();

  await uploadBytes(photoRef, imageBlob, {
    contentType: "image/jpeg",
  });

  return getDownloadURL(photoRef);
};
