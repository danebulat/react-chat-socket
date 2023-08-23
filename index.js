const io = require('socket.io')(8900, {
  cors: {
    origin: ["http://localhost:5174", "http://localhost:5000"],
  }
});

/* -------------------------------------------------- */
/* In-memory cache of connected users                 */
/* -------------------------------------------------- */

let users = [];

/* -------------------------------------------------- */
/* Helper fuctions                                    */
/* -------------------------------------------------- */

const addUser = (userId, socketId) => {
  const existing = users.find(user => 
    user.userId === userId || user.socketId === socketId);

  if (existing !== undefined) {
    users[users.indexOf(existing)] = { userId, socketId, conversationId: null }
    console.log(`socket ID updated`);
  } else {
    users.push({ userId, socketId, conversationId: null });
  }
}

const removeUser = (socketId) => {
  users = users.filter(user => user.socketId !== socketId);
}

const getUsersInConversation = (conversationId) => {
  return users.filter(user => user.conversationId === conversationId);
}

const setUserConversation = (senderId, conversationId) => {
  users = users.map(u => {
    if (u.userId === senderId) {
      u.conversationId = conversationId;
      return u;
    } else {
      return u;
    }
  });
}

/* -------------------------------------------------- */
/* Handle connections                                 */
/* -------------------------------------------------- */

io.on("connection", (socket) => {
  console.log("a user connected...");


  /* cache userId and socketId from client */
  socket.on("addUser", userId => {
    addUser(userId, socket.id);
    console.log(users);

    //update online users list
    io.emit("getUsers", users);
  });


  /* set user's joined conversation */
  socket.on("joinedChat", ({ senderId, conversationId }) => {
    setUserConversation(senderId, conversationId);
    
    //TODO: Don't need to emit to all connected users
    io.emit("chatJoined", {conversationId});
  });


  /* send and get message */
  socket.on("handleNewMessage", ({senderId, conversationId, text}) => {

    //get all users in a conversation
    const users = getUsersInConversation(conversationId);

    //send message back to the connected users (but not sending user)
    users.forEach(user => {
      if (user.userId !== senderId) {
        io.to(user.socketId).emit("getMessage", {
          senderId, text
        });
      }
    });
  });


  /* disconnect function */
  socket.on("disconnect", () => {
    console.log("a user disconnected");
    removeUser(socket.id);

    //update online users list
    io.emit("getUsers", users);
  });
});
