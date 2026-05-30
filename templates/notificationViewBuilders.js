



export const notificationViewBuilders = {

    contest_joined: ({
      sender,
      metadata,
    }) => ({
      text:
        sender.name ? `${sender.name} joined ${metadata.stageName} Stage`:
                    `You have joined ${metadata.stageName} Stage` ,
      subtitle:
        `Region ${metadata.stageRegion}`,
      image:
        sender?.profileImage?.publicUrl || null,
    }),
    performance_posted: ({
      sender,
      metadata,
    }) => ({
      text:
        sender.name ?`${sender.name} posted a new performance` :
                      `Your performance is live on ${metadata.stageName} Stage `,
      subtitle:
        metadata.stageName || "",
      image:
        sender?.profile_image || null,
    }),
    contest_queued: ({
        sender,
        metadata,
      }) => ({
        text:
        //   sender.name ?`${sender.name} posted a new performance` :
       `Your are in queue for the ${metadata.stageName} Stage ,
        you will be notified when you are on stage`,
        subtitle:
          metadata.stageName || "",
        image:
          sender?.profile_image || null,
      }),
    eliminated: ({
        sender,
        metadata,
      }) => ({
        text:
        //   sender.name ?`${sender.name} posted a new performance` :
       `Your are eliminated from the ${metadata.stageName} Stage `,
        subtitle:
          metadata.stageName || "",
        image:
          sender?.profile_image || null,
      }),
    friend_request: ({
      sender,
    }) => ({
      text:
        `${sender.name} sent you a friend request`,
      subtitle:
        sender.city || "",
      image:
        sender.profile_image || null,
    }),
  
  };


