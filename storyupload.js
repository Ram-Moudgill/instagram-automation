const { google } = require("googleapis");
const { get } = require("request-promise");
const fs = require("fs/promises");
const path = require("path");
const { IgApiClient } = require("instagram-private-api");

const storyUpload = async (ig, user) => {
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

    async function getVideo() {
      const folderId = user.videoFolderId;
      const res = await drive.files.list({
        q: `'${folderId}' in parents`,
        pageSize: 1,
        fields: "nextPageToken, files(id, name, webContentLink)",
      });
      if (res.data.files.length > 0) {
        const file = res.data.files[0];
        console.log(`File name: ${file.name}`);
        console.log(`File ID: ${file.id}`);
        console.log(`Download link: ${file.webContentLink}`);
        const videoBuffer = await get({
          url: file.webContentLink,
          encoding: null,
        });
        const caption = `Follow @${user.username}`;

        // Upload the story
        const { media } = await ig.publish.story({
          file: videoBuffer,
          caption,
        });
        console.log("Story uploaded");

        // Delete the video from Google Drive
        drive.files.delete({
          fileId: file.id,
        });
      } else {
        console.log("No files found.");
      }
    }

    await ig.simulate.preLoginFlow();
    const loggedInUser = await ig.account.currentUser();
    console.log(`Logged in as @${loggedInUser.username}`);

    await getVideo();
  } catch (error) {
    console.error(error);
  }
};

module.exports = { storyUpload };
