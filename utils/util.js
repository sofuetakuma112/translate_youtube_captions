export const sliceByNumber = (array, number) => {
  const length = Math.ceil(array.length / number)
  return new Array(length).fill().map((_, i) =>
    array.slice(i * number, (i + 1) * number)
  )
}

export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
