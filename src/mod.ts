import { DependencyContainer } from "tsyringe";

import { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import type { StaticRouterModService } from "@spt/services/mod/staticRouter/StaticRouterModService";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import { SaveServer } from "@spt/servers/SaveServer";
import { Watermark } from '@spt/utils/Watermark';
import { DatabaseServer } from "@spt/servers/DatabaseServer";
import { MailSendService } from "@spt/services/MailSendService";
import { ItemHelper } from "@spt/helpers/ItemHelper";
import { HashUtil } from "@spt/utils/HashUtil";
import { IUserDialogInfo } from "@spt/models/eft/profile/ISptProfile";
import { IItem } from "@spt/models/eft/common/tables/IItem";
import { BaseClasses } from "@spt/models/enums/BaseClasses";
import { PresetHelper } from "@spt/helpers/PresetHelper";

const LM_VERSION = "0.1.0"

class LiveMod implements IPreSptLoadMod
{
    private saveServer: SaveServer;
    private watermark: Watermark;
    private databaseServer: DatabaseServer;
    private mailSendService: MailSendService;
    private itemHelper: ItemHelper;
    private hashUtil: HashUtil;
    private presetHelper: PresetHelper;

    private lmChatBot: IUserDialogInfo;

    public preSptLoad(container: DependencyContainer): void
    {
        const logger = container.resolve<ILogger>("WinstonLogger");
        const staticRouterModService = container.resolve<StaticRouterModService>("StaticRouterModService");

        staticRouterModService.registerStaticRouter(
            'LMRouter',
            [
                {
                    url: '/livemod/status',
                    action: async (url: string, info: any, sessionId: string, output: string) => {
                        logger.log(`LiveMod Status OK`, LogTextColor.GREEN);
                        const version = this.watermark.getVersionTag();
                        return JSON.stringify({version, LM_VERSION});
                    },
                },
                {
                    url: '/livemod/profiles',
                    action: (url: string, info: any, sessionId: string, output: string) => {
                        return Promise.resolve(JSON.stringify(this.saveServer.getProfiles()));
                    },
                },
                {
                    url: '/livemod/items',
                    action: async (url: string, info: any, sessionId: string, output: string) => {
                        return JSON.stringify({
                            items: this.databaseServer.getTables().templates.items,
                            globalPresets: this.databaseServer.getTables().globals.ItemPresets
                        });
                    },
                },
                {
                    url: '/livemod/add',
                    action: async (url: string, info: any, sessionId: string, output: string) => {
                        logger.log(JSON.stringify(info), LogTextColor.GREEN);
                        const checkedItem = this.itemHelper.getItem(info.tplId);
                        if (!checkedItem[0]) {
                            this.mailSendService.sendUserMessageToPlayer(
                                sessionId,
                                this.lmChatBot,
                                "That item could not be found. Please refine your request and try again.",
                            );
                            return JSON.stringify({"success": "false"});;
                        }
                
                        const itemsToSend: IItem[] = [];
                        const preset = this.presetHelper.getDefaultPreset(checkedItem[1]._id);
                        if (preset) {
                            for (let i = 0; i < info.quantity; i++) {
                                let items = Array.from(preset._items);
                                items = this.itemHelper.replaceIDs(items);
                                itemsToSend.push(...items);
                            }
                        } else if (this.itemHelper.isOfBaseclass(checkedItem[1]._id, BaseClasses.AMMO_BOX)) {
                            for (let i = 0; i < info.quantity; i++) {
                                const ammoBoxArray: IItem[] = [];
                                ammoBoxArray.push({ _id: this.hashUtil.generate(), _tpl: checkedItem[1]._id });
                                itemsToSend.push(...ammoBoxArray);
                            }
                        } else {
                            if (checkedItem[1]._props.StackMaxSize === 1) {
                                for (let i = 0; i < info.quantity; i++) {
                                    itemsToSend.push({
                                        _id: this.hashUtil.generate(),
                                        _tpl: checkedItem[1]._id,
                                        upd: this.itemHelper.generateUpdForItem(checkedItem[1]),
                                    });
                                }
                            } else {
                                const item: IItem = {
                                    _id: this.hashUtil.generate(),
                                    _tpl: checkedItem[1]._id,
                                    upd: this.itemHelper.generateUpdForItem(checkedItem[1]),
                                };
                                item.upd.StackObjectsCount = info.quantity;
                                try {
                                    itemsToSend.push(...this.itemHelper.splitStack(item));
                                } catch {
                                    this.mailSendService.sendUserMessageToPlayer(
                                        sessionId,
                                        this.lmChatBot,
                                        "Too many items requested. Please lower the amount and try again.",
                                    );
                                    return JSON.stringify({"success": "false"});
                                }
                            }
                        }
                
                        this.itemHelper.setFoundInRaid(itemsToSend);
                
                        this.mailSendService.sendSystemMessageToPlayer(sessionId, "LiveMod Added", itemsToSend);
                        return JSON.stringify({"success": "true"});
                    },
                },
            ],
            'give-ui-top-level-route',
        );
    }

    public postDBLoad(container: DependencyContainer): void
    {
        this.saveServer = container.resolve<SaveServer>("SaveServer");
        this.watermark = container.resolve<Watermark>("Watermark");
        this.databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
        this.mailSendService = container.resolve<MailSendService>("MailSendService");
        this.itemHelper = container.resolve<ItemHelper>("ItemHelper");
        this.hashUtil = container.resolve<HashUtil>("HashUtil");
        this.presetHelper = container.resolve<PresetHelper>("PresetHelper");

        this.lmChatBot = {
            _id: this.hashUtil.generate(),
            aid: this.hashUtil.generateAccountId(),
            Info: {
                Nickname: "LiveMod",
                Side: "Client",
                Level: 69,
                MemberCategory: 16,
                SelectedMemberCategory: 16,
            },
        };

    }
}

export const mod = new LiveMod();
