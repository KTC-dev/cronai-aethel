export async function sendMessageToQueue(queue, message) {
    await queue.send(message);
}
