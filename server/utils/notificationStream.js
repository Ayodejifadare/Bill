const clients = new Map();

export function addClient(userId, res) {
  clients.set(userId, res);
}

export function removeClient(userId) {
  clients.delete(userId);
}

export function sendEvent(userId, data) {
  const client = clients.get(userId);
  if (client) {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}
