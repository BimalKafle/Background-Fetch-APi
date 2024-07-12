<template>
  <div>
    <input type="file" @change="handleFileChange" />
    <button @click="uploadFile" :disabled="!selectedFile">Upload</button>
    <p>{{ message }}</p>
    <p v-if="time">Time taken to upload: {{ time }} seconds</p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const selectedFile = ref(null);
const message = ref("");
const time = ref();

const s3Config = {
  accessKeyId: import.meta.env.VITE_APP_ACCESS_KEY,
  secretAccessKey: import.meta.env.VITE_APP_SECRET_ACCESS_KEY,
  region: import.meta.env.VITE_APP_REGION,
  bucketName: import.meta.env.VITE_APP_BUCKET,
};

const handleFileChange = (event) => {
  selectedFile.value = event.target.files[0];
};

const uploadFile = async () => {
  if (!selectedFile.value) {
    message.value = "No file selected";
    return;
  }

  message.value = "Generating presigned URL...";
  let presignedUrl;

  try {
    const s3Client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });

    const command = new PutObjectCommand({
      Bucket: s3Config.bucketName,
      Key: selectedFile.value.name,
      ContentType: selectedFile.value.type,
    });

    presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  } catch (error) {
    message.value = `Error generating presigned URL: ${error.message}`;
    return;
  }

  message.value = "Uploading...";

  if ("BackgroundFetchManager" in self) {
    try {
      const swReg = await navigator.serviceWorker.ready;
      console.log("Service Worker ready:", swReg);

      const bgFetch = await swReg.backgroundFetch.fetch(
        "upload-file-abc",
        [
          new Request(presignedUrl, {
            method: "PUT",
            body: selectedFile.value,
            headers: { "Content-Type": selectedFile.value.type },
          }),
        ],
        {
          title: "File Upload",
          downloadTotal: selectedFile.value.size,
        }
      );

      bgFetch.addEventListener("progress", (event) => {
        if (!event.uploadTotal || !event.uploaded) return;
        const percent = Math.round((event.uploaded / event.uploadTotal) * 100);
        console.log(`Upload progress: ${percent}%`);
      });

      bgFetch.addEventListener("success", (event) => {
        console.log("File uploaded successfully");
        message.value = "File uploaded successfully";
        time.value = (event.totalDownload / 1000).toFixed(2);
        selectedFile.value = null; // Reset the selected file
      });

      bgFetch.addEventListener("failure", (event) => {
        console.error("Error uploading file:", event);
        message.value = "Error uploading file";
      });
    } catch (error) {
      message.value = `Error uploading file: ${error.message}`;
    }
  } else {
    message.value = "Background Fetch API not supported";
  }
};
</script>
