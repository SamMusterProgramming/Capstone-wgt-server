



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
        sender.profile_image || null,
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


