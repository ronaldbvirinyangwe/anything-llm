process.env.STORAGE_DIR = "test-storage"; // needed for tests to run
const { YoutubeTranscript } = require("../../../../../utils/extensions/YoutubeTranscript/YoutubeLoader/youtube-transcript.js");

const VIDEO_ID = "BJjsfNO5JTo";

function videoPageWithTracks(tracks) {
  return `<script>{"captions":${JSON.stringify({
    playerCaptionsTracklistRenderer: { captionTracks: tracks },
  })},"videoDetails":{}}</script>`;
}

const transcriptResponse = {
  actions: [
    {
      updateEngagementPanelAction: {
        content: {
          transcriptRenderer: {
            content: {
              transcriptSearchPanelRenderer: {
                body: {
                  transcriptSegmentListRenderer: {
                    initialSegments: [
                      {
                        transcriptSegmentRenderer: {
                          snippet: { runs: [{ text: "Hello" }, { text: " world" }] },
                        },
                      },
                      {
                        transcriptSegmentRenderer: {
                          snippet: { runs: [{ text: " from\nYouTube" }] },
                        },
                      },
                      { transcriptSegmentRenderer: {} },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
  ],
};

function decodeProtobufStrings(encoded) {
  const buffer = Buffer.from(encoded, "base64");
  const fields = {};
  let offset = 0;

  while (offset < buffer.length) {
    const fieldNumber = buffer[offset++] >> 3;
    let length = 0;
    let shift = 0;
    let byte;
    do {
      byte = buffer[offset++];
      length |= (byte & 0x7f) << shift;
      shift += 7;
    } while (byte & 0x80);
    fields[fieldNumber] = buffer.subarray(offset, offset + length).toString();
    offset += length;
  }

  return fields;
}

describe("YoutubeTranscript", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("selects a human transcript and parses its segments", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        text: async () =>
          videoPageWithTracks([
            { languageCode: "en", kind: "asr" },
            { languageCode: "es" },
            { languageCode: "en" },
          ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => transcriptResponse,
      });

    await expect(
      YoutubeTranscript.fetchTranscript(VIDEO_ID, { lang: "en" })
    ).resolves.toBe("Hello world from YouTube");

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      `https://www.youtube.com/watch?v=${VIDEO_ID}`,
      { credentials: "omit" }
    );
    const postBody = JSON.parse(global.fetch.mock.calls[1][1].body);
    const outerParams = decodeProtobufStrings(postBody.params);
    const trackParams = decodeProtobufStrings(outerParams[2]);
    expect(outerParams[1]).toBe(VIDEO_ID);
    expect(trackParams).toEqual({ 1: "", 2: "en" });
  });

  it("prefers the requested language over the English fallback", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        text: async () =>
          videoPageWithTracks([
            { languageCode: "en" },
            { languageCode: "zh-HK" },
          ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => transcriptResponse,
      });

    await YoutubeTranscript.fetchTranscript(VIDEO_ID, { lang: "zh-HK" });

    const postBody = JSON.parse(global.fetch.mock.calls[1][1].body);
    const outerParams = decodeProtobufStrings(postBody.params);
    expect(decodeProtobufStrings(outerParams[2])).toEqual({
      1: "",
      2: "zh-HK",
    });
  });
});
