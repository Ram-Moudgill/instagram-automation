const { google } = require("googleapis");
const { get } = require("request-promise");
const fs = require("fs/promises");
const path = require("path");

const postUpload = async (ig, user, cronJob) => {
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
      const folderId = user.folderId;
      const res = await drive.files.list({
        q: `'${folderId}' in parents`,
        pageSize: 1,
        fields: "nextPageToken, files(id, name, webContentLink)",
      });
      if (res.data.files.length > 0) {
        const file = res.data.files[0];
        const imageBuffer = await get({
          url: file.webContentLink,
          encoding: null,
        });
        fileId = file.id;

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

        // Create caption for post
        const caption = `Follow @${user.username} ${randomTags
          .map((tag) => `#${tag}`)
          .join(" ")}`;
        try {
          const publishResult = await ig.publish.photo({
            file: imageBuffer,
            caption,
          });
          drive.files.delete({
            fileId: file.id,
          });
          console.log("Post uploaded");
        } catch (error) {
          console.log(error);
          drive.files.delete({
            fileId: file.id,
          });
        }
      } else {
        console.log("No files found.");
      }
    }
    getImage();
  } catch (error) {
    console.error(error);
  }
};

module.exports = { postUpload };
