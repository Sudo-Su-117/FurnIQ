import { Module } from '@nestjs/common';
import { ContactsService } from './services/contacts.service';
import { ContactsController } from './controllers/contacts.controller';

@Module({
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
