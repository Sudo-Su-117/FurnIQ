import { Module } from '@nestjs/common';
import { AccountingEngineService } from './accounting-engine/accounting-engine.service';
import { AccountsService } from './accounts/accounts.service';
import { AccountsController } from './accounts/accounts.controller';
import { JournalsService } from './journals/journals.service';
import { JournalsController } from './journals/journals.controller';
import { JournalEntriesService } from './journal-entries/journal-entries.service';
import { JournalEntriesController } from './journal-entries/journal-entries.controller';

@Module({
  controllers: [
    AccountsController,
    JournalsController,
    JournalEntriesController,
  ],
  providers: [
    AccountingEngineService,
    AccountsService,
    JournalsService,
    JournalEntriesService,
  ],
  exports: [
    AccountingEngineService,
    AccountsService,
    JournalsService,
    JournalEntriesService,
  ],
})
export class AccountingModule {}
