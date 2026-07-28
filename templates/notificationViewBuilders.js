



export const notificationViewBuilders = {

    contest_joined: ({
                    sender,
                    metadata,
                    }) => ({
      text:
        sender?.name ? `${sender.name} joined ${metadata.stageName} Stage`:
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
        sender?.name ?`${sender.name} posted a new performance` :
                      `Your performance is live on ${metadata.stageName} Stage `,
      subtitle:
        metadata.stageName || "",
      image:
        sender?.profileImage?.publicUrl || null,
    }),
    contest_queued: ({
                    sender,
                    metadata,
                    }) => ({
        text:
        //   sender.name ?`${sender.name} posted a new performance` :
       `Your are in queue for the ${metadata.stageName} Stage , you will be notified when you are on stage`,
        subtitle:
          metadata.stageName || "",
        image:
          sender?.profileImage?.publicUrl || null,
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
          sender?.profileImage?.publicUrl || null,
      }),
    vote_received: ({
        sender,
        metadata,
        }) => ({
        text:
        `${metadata.recent_voters[0]?.voter_name} ${metadata.recent_voters[1]?.voter_name} and ${metadata.total_votes - 2} others have voted for your in ${metadata.stageName} Stage `,
        subtitle:
        metadata.stageName || "",
        image:
        sender?.profileImage?.publicUrl || null,
        }),
    friend_request: ({
                    sender,
                    metadata
                    }) => ({
      text:
        `${metadata.sender_name} sent you a friend request`,
    //   subtitle:
    //     sender.city || "",
      image:
      sender?.profileImage?.publicUrl || null,
    }),
    friend_request_accepted: ({
        sender,
        metadata
        }) => ({
        text:
        `${metadata.sender_name} has accepted your friend request`,
        //   subtitle:
        //     sender.city || "",
        image:
        sender?.profileImage?.publicUrl || null,
        }),
    friend_request_accepted_byou: ({
        sender,
        metadata
        }) => ({
        text:
        `${metadata.sender_name} is a friend , start sharing`,
        //   subtitle:
        //     sender.city || "",
        image:
        sender?.profileImage?.publicUrl || null,
        }),
        //arenas
    arena_created: ({
      sender,
      metadata,
      }) => ({
        text:
        sender?.name ?`${sender.name} has created a new arena , view and follow arena ` :
                `Your arena is live , start adding performances`,
        subtitle:
        metadata.arena_name || "",
        image:
        sender?.profileImage?.publicUrl || null,
    }),
    follow_arena: ({
      sender,
      metadata,
      }) => ({
        text:
        metadata.recent_followers.length >=2 ?
        `${metadata.recent_followers[0]?.follower_name} ${metadata.recent_followers[1]?.follower_name} and ${metadata.total_followers - 2} others have folowed your arena  ${metadata.arena_name} `
        : `${metadata.recent_followers[0]?.follower_name}  has followed  your arena ${metadata.arena_name}   `,
        subtitle:
        metadata.arena_name || "",
        image:
        sender?.profileImage?.publicUrl || null,
    }),
    star_arena: ({
      sender,
      metadata,
      }) => ({
        text:
        metadata.recent_starrers.length >=2 ?
        `${metadata.recent_starrers[0]?.starrer_name} ${metadata.recent_starrers[1]?.starrer_name} and ${metadata.total_starrers - 2} others have starred your arena  ${metadata.arena_name} `
        : `${metadata.recent_starrers[0]?.starrer_name}  has starred  your arena ${metadata.arena_name}   `,
        subtitle:
        metadata.arena_name || "",
        image:
        sender?.profileImage?.publicUrl || null,
    }),
    performance_added: ({
          sender,
          metadata,
          }) => ({
            text:
            sender?.name ?`${sender.name} posted a new performance in his arena` :
                    `Your performance is live `,
            subtitle:
            metadata.arena_name || "",
            image:
            sender?.profileImage?.publicUrl || null,
        }),
    fire_received: ({
        sender,
        metadata,
        }) => ({
        text:  
        metadata.recent_firers.length >=2 ?
        `${metadata.recent_firers[0]?.firer_name} ${metadata.recent_firers[1]?.firer_name} and ${metadata.total_fires - 2} others have fired for your performance in ${metadata.arena_name} Arena `
        : `${metadata.recent_firers[0]?.firer_name}  has fired for your performance in ${metadata.arena_name} Arena  `,
        subtitle:
        metadata.arena_name || "",
        image:
        sender?.profileImage?.publicUrl || null,
        }),   
    comment_received: ({
        sender,
        metadata,
        }) => ({
        text:  
        metadata.recent_commentors.length >=2 ?
        `${metadata.recent_commentors[0]?.commentor_name} ${metadata.recent_commentors[1]?.commentor_name} and ${metadata.total_commentors - 2} others have commented  your performance in ${metadata.arena_name} Arena `
        : `${metadata.recent_commentors[0]?.commentor_name}  has commented your performance in ${metadata.arena_name} Arena  `,
        subtitle:
        metadata.arena_name || "",
        image:
        sender?.profileImage?.publicUrl || null,
        }),  
};


