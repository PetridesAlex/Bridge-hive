module.exports = {
  manipulateAsync: jest.fn(async (uri) => ({
    uri,
    width: 100,
    height: 100,
  })),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
};
