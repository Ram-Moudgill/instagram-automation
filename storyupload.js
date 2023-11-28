const { google } = require("googleapis");
const { readFile } = require("fs");
const { writeFile, unlink } = require("fs").promises;
const { promisify } = require("util");
const readFileAsync = promisify(readFile);
const unlinkFile = promisify(unlink);
const ffmpeg = require("fluent-ffmpeg");
const { readFileSync } = require("fs");
// const { StickerBuilder } = require("instagram-private-api");
const {
  StickerBuilder,
} = require("instagram-private-api/dist/sticker-builder");
const storyUpload = async (ig, user, cronJob) => {
  try {
    const CLIENT_ID =
      "555559695118-db7hd273bd2f41555t3f9e64t7oimuhi.apps.googleusercontent.com";
    const CLIENT_SECRET = "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";
    const REDIRECT_URI = "http://localhost:3000";
    const REFRESH_TOKEN = user.tokens.refresh_token;
    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );
    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
    const drive = google.drive({
      version: "v3",
      auth: oauth2Client,
    });
    async function getImage() {
      const folderId = user.storyFolderId;
      const res = await drive.files.list({
        q: `'${folderId}' in parents`,
        pageSize: 1,
        fields: "nextPageToken, files(id, name, webContentLink, mimeType)",
      });
      if (res.data.files.length > 0) {
        const file = res.data.files[0];
        const response = await drive.files.get(
          { fileId: file.id, alt: "media" },
          { responseType: "arraybuffer" }
        );
        const imageBuffer = Buffer.from(response.data);
        fileId = file.id;
        if (file.mimeType === "video/mp4") {
          const videoFilePath = "./uploads/video.mp4";
          await writeFile(videoFilePath, imageBuffer);
          console.log("Video file saved locally:", videoFilePath);
          let outputFilename = "thumbnail.jpg";
          let outputPath = "./uploads";
          await new Promise((resolve, reject) => {
            ffmpeg()
              .input(videoFilePath)
              .screenshots({
                count: 1,
                folder: outputPath,
                filename: outputFilename,
                timemarks: ["1"],
              })
              .on("end", async () => {
                console.log("First frame extracted successfully!");
                const savedFilePath = `${outputPath}/${outputFilename}`;
                const savedFileData = readFileSync(savedFilePath);
                console.log("file unlinked");
                unlinkFile(savedFilePath);
                console.log("Saved file deleted successfully!");
                await ig.publish.story({
                  video: imageBuffer,
                  coverImage: savedFileData,
                  stickerConfig: new StickerBuilder()

                    .add(
                      StickerBuilder.hashtag({
                        tagName: "insta",
                      }).center()
                    )
                    .build(),
                });
                console.log("story uploaded");
                drive.files.delete({
                  fileId: file.id,
                });
                cronJob.stop();
                resolve();
              })
              .on("error", (err) => {
                console.error("Error extracting first frame:", err);
                reject(err);
              });
          });
        } else {
          console.log("image");
          await ig.publish.story({
            file: imageBuffer,
            stickerConfig: new StickerBuilder()
              .add(
                StickerBuilder.hashtag({
                  tagName: "insta",
                }).center()
              )
              .build(),
          });
          drive.files.delete({
            fileId: file.id,
          });
        }

        cronJob.stop();
      } else {
        console.log("No files found.");
        cronJob.stop();
      }
    }

    getImage();
  } catch (error) {
    cronJob.stop();
    console.error(error);
  }
};

module.exports = { storyUpload };
