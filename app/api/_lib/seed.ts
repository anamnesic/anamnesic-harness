import { DataSource } from 'typeorm';
import { User } from '@/src/core/entities/User';
import { Workspace } from '@/src/core/entities/Workspace';
import { WorkspaceMember } from '@/src/core/entities/WorkspaceMember';
import { SettingsService } from '@/src/core/services/SettingsService';

export async function seedDefaultData(db: DataSource): Promise<void> {
  const userRepo = db.getRepository(User);
  const workspaceRepo = db.getRepository(Workspace);
  const memberRepo = db.getRepository(WorkspaceMember);

  // Check if system user exists
  let systemUser = await userRepo.findOne({ where: { email: 'system@kairos.local' } });
  
  if (!systemUser) {
    // SHA-256 for 'kairos2026'
    const passwordHash = '4b1d624b7a19f20e40562e879a61761e3895e638b9903b41d063715c0e7d56e7';
    
    systemUser = userRepo.create({
      email: 'system@kairos.local',
      passwordHash,
      fullName: 'System',
      status: 'active',
    });
    systemUser = await userRepo.save(systemUser);
    console.log('Created system user');
  }

  // Check if default workspace exists
  let defaultWorkspace = await workspaceRepo.findOne({ 
    where: { slug: 'default' } 
  });

  if (!defaultWorkspace) {
    defaultWorkspace = workspaceRepo.create({
      name: 'Default Workspace',
      slug: 'default',
      description: 'Default workspace for KAIROS',
      ownerId: systemUser.id,
      status: 'active',
      metadata: { isDefault: true },
    });
    defaultWorkspace = await workspaceRepo.save(defaultWorkspace);
    console.log('Created default workspace');

    // Add system user as owner
    await memberRepo.save(memberRepo.create({
      workspaceId: defaultWorkspace.id,
      userId: systemUser.id,
      role: 'owner',
    }));
  }

  // Initialize default settings for the workspace
  const settingsService = new SettingsService(db);
  await settingsService.initializeDefaultSettings(defaultWorkspace.id);
  console.log('Initialized default settings');

  console.log('Database seeding completed');
}
