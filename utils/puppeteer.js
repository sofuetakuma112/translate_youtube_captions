export const getTextContentFromElemHandler = async (elementHandle) => {
  const textContentProperty = await elementHandle.getProperty("textContent");
  return textContentProperty.jsonValue();
};
