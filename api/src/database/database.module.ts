import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import {
  ActivitySchema,
  InvitationSchema,
  LoginCodeSchema,
  MilestoneSchema,
  MODEL,
  ProjectSchema,
  UserSchema,
} from "../schemas/schemas";

const features = MongooseModule.forFeature([
  { name: MODEL.Project, schema: ProjectSchema },
  { name: MODEL.Milestone, schema: MilestoneSchema },
  { name: MODEL.Activity, schema: ActivitySchema },
  { name: MODEL.User, schema: UserSchema },
  { name: MODEL.LoginCode, schema: LoginCodeSchema },
  { name: MODEL.Invitation, schema: InvitationSchema },
]);

// One shared connection pool (mirrors the Next.js app's cached connection) plus
// every model, re-exported so feature modules only need `imports:
// [DatabaseModule]`.
@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>("MONGODB_URI");
        if (!uri) throw new Error("MONGODB_URI is not set. Add it to api/.env");
        return { uri, bufferCommands: false };
      },
    }),
    features,
  ],
  exports: [features],
})
export class DatabaseModule {}
