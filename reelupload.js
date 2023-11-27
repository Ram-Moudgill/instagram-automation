const { google } = require("googleapis");
const fs = require("fs/promises");
const ffmpeg = require("fluent-ffmpeg");
const { writeFile, unlink } = require("fs").promises;
const { promisify } = require("util");
const { readFileSync } = require("fs");
const unlinkFile = promisify(unlink);
const reelUpload = async (ig, user, cronJob) => {
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
      const folderId = user.videoFolderId;
      const res = await drive.files.list({
        q: `'${folderId}' in parents`,
        pageSize: 1,
        fields: "nextPageToken, files(id, name, webContentLink)",
      });

      if (res.data.files.length > 0) {
        const file = res.data.files[0];
        const response = await drive.files.get(
          { fileId: file.id, alt: "media" },
          { responseType: "arraybuffer" }
        );
        fileId = file.id;

        const videoBuffer = Buffer.from(response.data);

        // Save video buffer to a local file
        const videoFilePath = "./uploads/video.mp4";
        await writeFile(videoFilePath, videoBuffer);
        console.log("Video file saved locally:", videoFilePath);

        // Read captions and tags files
        const captionsPath = "./Config/" + user.username + "-captions.json";
        const tagsPath = "./Config/" + user.username + "-tags.json";
        const captions = JSON.parse(await fs.readFile(captionsPath));
        const tags = JSON.parse(await fs.readFile(tagsPath));
        const numTags = Math.floor(Math.random() * tags.length) + 1;

        // Choose a random caption and set of tags
        const randomCaption =
          captions[Math.floor(Math.random() * captions.length)];
        const randomTags = tags
          .sort(() => 0.5 - Math.random())
          .slice(0, numTags);
        // Generate a random number between 4 and 8
        const numberOfTags = Math.floor(Math.random() * (8 - 4 + 1)) + 4;

        // Shuffle function to randomize array elements
        function shuffle(array) {
          for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
          }
          return array;
        }

        // Shuffle the randomTags array
        const shuffledTags = shuffle(randomTags);

        // Select a random number of tags
        const selectedTags = shuffledTags.slice(0, numberOfTags);

        // Create the caption
        const caption = `Follow @${user.username} ${selectedTags
          .map((tag) => `#${tag}`)
          .join(" ")}`;

        try {
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
                console.log("ok");
                const savedFileData = readFileSync(savedFilePath);
                console.log("file unlinked");
                unlinkFile(savedFilePath);
                console.log("Saved file deleted successfully!");
                const publishResult = await ig.publish.video({
                  video: videoBuffer,
                  coverImage: savedFileData,
                  isClip: true,
                  clipsPreviewToFeed: true,
                  caption,
                });
                console.log("Reel uploaded");
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
        } catch (error) {
          console.error(error);
          drive.files.delete({
            fileId: file.id,
          });
          cronJob.stop();
        } finally {
          await unlinkFile(videoFilePath);
          console.log("Video file deleted from local system:", videoFilePath);
          cronJob.stop();
        }
      } else {
        console.log("No files found.");
        cronJob.stop();
      }
    }

    getImage();
  } catch (error) {
    console.error(error);
  }
};

module.exports = { reelUpload };
