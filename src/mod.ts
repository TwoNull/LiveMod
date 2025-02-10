import { DependencyContainer } from "tsyringe";

import { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import type { StaticRouterModService } from "@spt/services/mod/staticRouter/StaticRouterModService";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import { HttpResponseUtil } from "@spt/utils/HttpResponseUtil";
import { ItemHelper } from "@spt/helpers/ItemHelper";
import { HashUtil } from "@spt/utils/HashUtil";
import { InventoryHelper } from "@spt/helpers/InventoryHelper";
import { ProfileHelper } from "@spt/helpers/ProfileHelper";
import { SaveServer } from "@spt/servers/SaveServer";
import { EventOutputHolder } from "@spt/routers/EventOutputHolder";

class LiveMod implements IPreSptLoadMod
{
    private httpResponseUtil: HttpResponseUtil;
    private itemHelper: ItemHelper;
    private inventoryHelper: InventoryHelper;
    private hashUtil: HashUtil;
    private profileHelper: ProfileHelper;
    private saveServer: SaveServer;
    private eventOutputHolder: EventOutputHolder;

    public preSptLoad(container: DependencyContainer): void
    {
        const logger = container.resolve<ILogger>("WinstonLogger");
        const staticRouterModService = container.resolve<StaticRouterModService>("StaticRouterModService");

        staticRouterModService.registerStaticRouter(`GetStatusLM`,
            [{
                url: "/livemod/status",
                action: async () => 
                {
                    logger.logWithColor("LiveMod Status OK", LogTextColor.GREEN);
                    return this.httpResponseUtil.getBody("ok", 200);
                }
            }], "status"
        );

        staticRouterModService.registerStaticRouter(`AddItemLM`,
            [{
                url: "/livemod/additem",
                action: async () => 
                {
                    const tpl = "5a43957686f7742a2c2f11b0";
                    logger.logWithColor("AddItem Request for TPL " + tpl, LogTextColor.GREEN);
                    const [ok, iTemplate] = this.itemHelper.getItem(tpl)
                    if (!ok) {
                        return this.httpResponseUtil.getBody(undefined, 400, "invalid tpl");
                    }
                    const iUpd = this.itemHelper.generateUpdForItem(iTemplate)
                    const addItemReq = {
                        itemWithModsToAdd: [
                            {
                                _id: this.hashUtil.generate(),
                                _tpl: tpl,
                                parentId: iTemplate._parent,
                                upd: iUpd,
                            }
                        ],
                        callback: (buyCount: number) => {},
                        foundInRaid: true,
                        useSortingTable: false,
                    };

                    let sessId = "";

                    const profiles = this.saveServer.getProfiles();
                    logger.logWithColor("List of Profiles:", LogTextColor.YELLOW);
                    for ( const p in profiles) {
                        logger.logWithColor(p + ":" + profiles[p].info.username, LogTextColor.YELLOW);
                        sessId = p;
                    }

                    logger.logWithColor("Got current session id " + sessId, LogTextColor.GREEN);
                    const iPmcData = this.profileHelper.getPmcProfile(sessId);
                    
                    const output = this.eventOutputHolder.getOutput(sessId);

                    this.inventoryHelper.addItemToStash(sessId, addItemReq, iPmcData, output);

                    return JSON.stringify(output)
                }
            }], "status"
        );
    }

    public postDBLoad(container: DependencyContainer): void
    {
        this.httpResponseUtil = container.resolve<HttpResponseUtil>("HttpResponseUtil");
        this.itemHelper = container.resolve<ItemHelper>("ItemHelper");
        this.inventoryHelper = container.resolve<InventoryHelper>("InventoryHelper");
        this.profileHelper = container.resolve<ProfileHelper>("ProfileHelper");
        this.hashUtil = container.resolve<HashUtil>("HashUtil");
        this.saveServer = container.resolve<SaveServer>("SaveServer");
        this.eventOutputHolder = container.resolve<EventOutputHolder>("EventOutputHolder");
    }
}

export const mod = new LiveMod();
