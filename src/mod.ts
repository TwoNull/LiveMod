import { DependencyContainer } from "tsyringe";

import { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import type { StaticRouterModService } from "@spt/services/mod/staticRouter/StaticRouterModService";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";

class LiveMod implements IPreSptLoadMod
{
    public preSptLoad(container: DependencyContainer): void
    {
        const logger = container.resolve<ILogger>("WinstonLogger");
        const staticRouterModService = container.resolve<StaticRouterModService>("StaticRouterModService");

        staticRouterModService.registerStaticRouter(`GetStatusLM`,
            [{
                url: "/livemod/status",
                action: async (url: string, info: any, sessionId: string, output: string) => 
                {
                    logger.logWithColor("LiveMod Status OK", LogTextColor.GREEN);
                    return JSON.stringify({ resp: "OK" });
                }
            }], "status"
        );

        staticRouterModService.registerStaticRouter(`AddItemLM`,
            [{
                url: "/livemod/additem",
                action: async (url: string, info: any, sessionId: string, output: string) => 
                {
                    
                    logger.logWithColor("LiveMod Status OK", LogTextColor.GREEN);
                    return JSON.stringify({ resp: "OK" });
                }
            }], "status"
        );
    }
}

export const mod = new LiveMod();
