import redis from "../../../config/redis.js";


const cacheSpotlightPerformances = async (
    performances
)=>{

    const PAGE_SIZE = 5;
    // 1. Remove old spotlight cache
    const oldPages = [];
    for(let i = 1; i <= 20; i++){
        oldPages.push(
            `spotlight:global:page:${i}`
        );
    }
    await redis.del(...oldPages);
    // 2. Create new pages
    const pages = Math.ceil(
        performances.length / PAGE_SIZE
    );
    for(let page = 0; page < pages; page++){
        const start = page * PAGE_SIZE;
        const data = performances.slice(
            start,
            start + PAGE_SIZE
        );
        await redis.set(
            `spotlight:global:page:${page + 1}`,
            JSON.stringify(data),
            {
                EX:60 * 60 * 12
            }
        );
    }

};


export default cacheSpotlightPerformances;