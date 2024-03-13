import { Request, Response, NextFunction } from 'express';
import redisClient from '../../cache/redis';
import { GrypeScan, ServerError, countVulnerability } from '../../backend-types';

interface CacheController {
  /**
   * @method GET
   * @abstract sets grype's db status to already updated
   * @returns {void}
   */
  setCacheGrypeDb: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * @method GET
   * @abstract see if grype's db has already been updated today
   * @returns {void}
   */
  checkCacheGrypeDb: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * @method POST
   * @abstract set countVulnerabilities to the redis cache
   * @returns {void}
   */
  setCacheScan: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;

  /**
   * @method POST
   * @param {string} req.body.scanName
   * @abstract Check RedisClient cache for first load / last scan
   * @returns {void}
   */
  checkCacheScan: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;
}

const cacheController: CacheController = {} as CacheController;

cacheController.checkCacheGrypeDb = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cachedDbStatus = await redisClient.get('cachedDbStatus');
    if (JSON.parse(cachedDbStatus)) {
    res.locals.cachedDbStatus = true
    }
    next()
  } catch (error) {
    const errObj: ServerError = {
      log: { err: `cacheController checkCacheGrypeDb Error: ${error}` },
      status: 500,
      message: 'internal server error'
    }
    next(errObj);
  }
}


cacheController.setCacheGrypeDb = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (res.locals.cachedDbStatus) {
    next()
  } else {
    try {
      await redisClient.set('cachedDbStatus', JSON.stringify(true));
      await redisClient.expire('cachedDbStatus', 60 * 60 * 24);
      next()
    } catch (error) {
      const errObj: ServerError = {
        log: { err: `cacheController setCacheGrypeDb Error: ${error}` },
        status: 500,
        message: 'internal server error'
      }
      next(errObj);
    }
  }
}

cacheController.setCacheScan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (res.locals.addToCache) {
    try {
      // cache vulnerability
      await redisClient.set(
        `${res.locals.scanName}&vulnerabilites`,
        JSON.stringify(res.locals.vulnerabilites)
      );
      // cache everything
      await redisClient.set(
        `${res.locals.scanName}&everything`,
        JSON.stringify(res.locals.everything)
      );
      // cache timeStamp
      await redisClient.set(
        `${res.locals.scanName}&timeStamp`,
        JSON.stringify(res.locals.timeStamp)
      );
      next()
    } catch (error) {
      const errObj: ServerError = {
        log: { err: `cacheController setCacheVulnerability Error: ${error}` },
        status: 500,
        message: 'internal server error'
      }
      next(errObj);
    }
  } else {
    next()
  }
}

cacheController.checkCacheScan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { scanName }: { scanName: string } = req.body;
  const cachedVulernabilities = await redisClient.get(
    `${scanName}&vulnerabilites`
  );
  const cachedEverything = await redisClient.get(`${scanName}&everything`);
  const cachedTimeStamp = await redisClient.get(`${scanName}&timeStamp`)
  if (cachedVulernabilities !== null) {
    res.locals.vulnerabilites = JSON.parse(cachedVulernabilities);
    res.locals.everything = JSON.parse(cachedEverything);
    res.locals.timeStamp = JSON.parse(cachedTimeStamp);
    next()
  }
  else {
    console.log('Cache miss:', `${scanName}`)
    next()
  }
}

export default cacheController;