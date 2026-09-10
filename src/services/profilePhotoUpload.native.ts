import * as FileSystem from "expo-file-system/legacy";
import type { User } from "firebase/auth";
import { getDownloadURL, type StorageReference } from "firebase/storage";

type UploadProfilePhotoInput = {
  fileUri: string;
  photoRef: StorageReference;
  user: User;
};

type FirebaseStorageErrorResponse = {
  error?: {
    message?: string;
  };
};

const getUploadErrorMessage = (body: string, fallback: string) => {
  try {
    const payload = JSON.parse(body) as FirebaseStorageErrorResponse;
    return payload.error?.message?.trim() || fallback;
  } catch {
    return fallback;
  }
};

const assertSuccessfulStatus = (
  status: number,
  body: string,
  fallback: string
) => {
  if (status < 200 || status >= 300) {
    throw new Error(getUploadErrorMessage(body, `${fallback} (${status}).`));
  }
};

export const uploadProfilePhoto = async ({
  fileUri,
  photoRef,
  user,
}: UploadProfilePhotoInput) => {
  const fileInfo = await FileSystem.getInfoAsync(fileUri);

  if (!fileInfo.exists || fileInfo.isDirectory) {
    throw new Error("A imagem otimizada não foi encontrada no aparelho.");
  }

  const idToken = await user.getIdToken();
  const endpoint =
    `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(photoRef.bucket)}/o` +
    `?name=${encodeURIComponent(photoRef.fullPath)}`;

  const sessionResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Firebase ${idToken}`,
      "Content-Type": "application/json; charset=utf-8",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(fileInfo.size),
      "X-Goog-Upload-Header-Content-Type": "image/jpeg",
      "X-Goog-Upload-Protocol": "resumable",
    },
    body: JSON.stringify({
      name: photoRef.fullPath,
      size: fileInfo.size,
      contentType: "image/jpeg",
      metadata: { ownerId: user.uid },
    }),
  });

  if (!sessionResponse.ok) {
    const responseBody = await sessionResponse.text();
    throw new Error(
      getUploadErrorMessage(
        responseBody,
        `Não foi possível iniciar o envio da foto (${sessionResponse.status}).`
      )
    );
  }

  const sessionUrl = sessionResponse.headers.get("x-goog-upload-url");

  if (!sessionUrl) {
    throw new Error("O Firebase não retornou uma sessão válida para o upload.");
  }

  const uploadResult = await FileSystem.uploadAsync(sessionUrl, fileUri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
    headers: {
      "Content-Type": "image/jpeg",
      "X-Goog-Upload-Command": "upload, finalize",
      "X-Goog-Upload-Offset": "0",
    },
  });

  assertSuccessfulStatus(
    uploadResult.status,
    uploadResult.body,
    "Não foi possível enviar a foto"
  );

  return getDownloadURL(photoRef);
};
