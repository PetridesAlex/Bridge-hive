module.exports = {
  getInfoAsync: jest.fn(async () => ({ exists: false })),
  readAsStringAsync: jest.fn(async () => ''),
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
};
