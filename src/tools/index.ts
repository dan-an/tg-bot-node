export const chooseRandomElement = (arr: any[]) => {
    return arr[Math.floor(Math.random() * arr.length)];
}