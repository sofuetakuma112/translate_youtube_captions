import { google } from "googleapis";
const youtube = google.youtube("v3");

const auth = new google.auth.GoogleAuth({
  // Scopes can be specified either as an array or as a single, space-delimited string.
  scopes: [
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/youtubepartner",
  ],
});
// Acquire an auth client, and bind it to all future calls
const authClient = await auth.getClient();
google.options({ auth: authClient });

const getCaptionIdVideoId = async (videoId) => {
  const res = await youtube.captions.list({
    // Returns the captions with the given IDs for Stubby or Apiary.
    // id: "placeholder-value",
    // ID of the Google+ Page for the channel that the request is on behalf of.
    // onBehalfOf: "placeholder-value",
    // *Note:* This parameter is intended exclusively for YouTube content partners. The *onBehalfOfContentOwner* parameter indicates that the request's authorization credentials identify a YouTube CMS user who is acting on behalf of the content owner specified in the parameter value. This parameter is intended for YouTube content partners that own and manage many different YouTube channels. It allows content owners to authenticate once and get access to all their video and channel data, without having to provide authentication credentials for each individual channel. The actual CMS account that the user authenticates with must be linked to the specified YouTube content owner.
    // onBehalfOfContentOwner: "placeholder-value",
    // part*パラメータは、APIレスポンスに含まれる1つ以上のキャプションリソースパートをカンマ区切りで指定します。パラメータ値に含めることができるパーツ名は、idとsnippetです。
    part: "id,snippet",
    // Returns the captions for the specified video.
    videoId,
  });
  // snippet.trackKindがstandardかつsnippet.languageがenのものがあればそれのcaptionIdを取得する
  // なければsnippet.trackKindがasrかつsnippet.languageがenのものを取得する
  const standardCaption = res.data.items.find(
    (item) =>
      item.snippet.trackKind === "standard" && item.snippet.language === "en"
  );
  const asrCaption = res.data.items.find(
    (item) => item.snippet.trackKind === "asr" && item.snippet.language === "en"
  );
  
  if (standardCaption || asrCaption) {
    return standardCaption?.id || asrCaption.id;
  } else {
    throw Error("字幕データが存在しない");
  }
}

const downloadCaptionByVideoId = async (videoId) => {
  const captionId = await getCaptionIdVideoId(videoId)
  console.log(`captionId: ${captionId}`)
  const res = await youtube.captions.download({
    // The ID of the caption track to download, required for One Platform.
    id: captionId,
    // ID of the Google+ Page for the channel that the request is be on behalf of
    // onBehalfOf: "placeholder-value",
    // *Note:* This parameter is intended exclusively for YouTube content partners. The *onBehalfOfContentOwner* parameter indicates that the request's authorization credentials identify a YouTube CMS user who is acting on behalf of the content owner specified in the parameter value. This parameter is intended for YouTube content partners that own and manage many different YouTube channels. It allows content owners to authenticate once and get access to all their video and channel data, without having to provide authentication credentials for each individual channel. The actual CMS account that the user authenticates with must be linked to the specified YouTube content owner.
    // onBehalfOfContentOwner: "placeholder-value",
    // Convert the captions into this format. Supported options are sbv, srt, and vtt.
    tfmt: "sbv",
    // tlang is the language code; machine translate the captions into this language.
    // tlang: "placeholder-value",
  });
  console.log(res.data);
}

downloadCaptionByVideoId("ZqW8JT1gt4U")