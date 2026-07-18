import redis from "../../../../config/redis.js";



const PAGE_SIZE = 10;
const SPOTLIGHT_TTL = {
    global: 60 * 60 * 8,       // 8 hours
    regional: 60 * 60 * 4,     // 4 hours
    local: 60 * 60 * 4         // 4 hours
};

const buildCacheKey = ({
    type,
    region,
    country
})=>{

    if(type === "global"){
        return "spotlight:global";
    }
    if(type === "regional"){
        return `spotlight:regional:${region}`;
    }
    if(type === "local"){
        return `spotlight:local:${country}`;
    }
};



const cacheSpotlightPerformances = async ({
    performances,
    type,
    region = null,
    country = null
})=>{

    const baseKey = buildCacheKey({
        type,
        region,
        country
    });
    const ttl = SPOTLIGHT_TTL[type];
    /*
        1. Remove old pages
    */

    const oldKeys = [];

    for(let i = 1; i <= 50; i++){
        oldKeys.push(
            `${baseKey}:page:${i}`
        );
    }

    if(oldKeys.length){
        await redis.del(
            ...oldKeys
        );
    }

    /*
        2. Create new pages
    */
    const totalPages =
        Math.ceil( performances.length / PAGE_SIZE );

    for( let page = 1; page <= totalPages; page++ ){
        const start =
            (page - 1 ) * PAGE_SIZE;
        const pageData =
            performances.slice(
                start,
                start + PAGE_SIZE
            );
        await redis.set(
            `${baseKey}:page:${page}`,
            JSON.stringify(pageData),
            {
                ex: ttl
            }
        );
    }

    /*
        3. Store metadata
        useful for pagination
    */

    await redis.set(
        `${baseKey}:meta`,
        JSON.stringify({
            totalPages,
            totalItems: performances.length,
            updatedAt:new Date()
        }),
        {
            ex:ttl
        }
    );

};

export default cacheSpotlightPerformances;