import { DialogFactory } from '@/services/tg/tools/dialogFactory';
import { SaveFilmDialog } from '@/services/tg/dialogs/saveFilmDialog';
import { ShoppingDialog } from '@/services/tg/dialogs/shoppingDialog';
import { WhatToBuyDialog } from '@/services/tg/dialogs/whatToBuyDialog';
import { AddEventDialog } from '@/services/tg/dialogs/addEventDialog';

DialogFactory.registerDialog('SaveFilmDialog', SaveFilmDialog);
DialogFactory.registerDialog('ShoppingDialog', ShoppingDialog);
DialogFactory.registerDialog('WhatToBuyDialog', WhatToBuyDialog);
DialogFactory.registerDialog('AddEventDialog', AddEventDialog);
