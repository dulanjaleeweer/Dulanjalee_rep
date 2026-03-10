import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { DatabaseModule } from './database.module';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { UserCredentials } from '../entities/user-credentials.entity';
import { UserRoleAssignment } from '../entities/user-role.entity';

/**
 * DatabaseModule spec — verifies the module wires TypeORM correctly
 * using a mock DataSource so no real PostgreSQL connection is needed.
 */
describe('DatabaseModule', () => {
  let module: TestingModule;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    target: null as unknown,
  };

  const mockDataSource = {
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    isInitialized: true,
    getRepository: jest.fn().mockReturnValue(mockRepository),
    createQueryRunner: jest.fn().mockReturnValue({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(),
        findOne: jest.fn(),
      },
    }),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(mockDataSource)
      .overrideProvider(getRepositoryToken(Tenant))
      .useValue({ ...mockRepository, target: Tenant })
      .overrideProvider(getRepositoryToken(User))
      .useValue({ ...mockRepository, target: User })
      .overrideProvider(getRepositoryToken(UserCredentials))
      .useValue({ ...mockRepository, target: UserCredentials })
      .overrideProvider(getRepositoryToken(UserRoleAssignment))
      .useValue({ ...mockRepository, target: UserRoleAssignment })
      .compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should compile', () => {
    expect(module).toBeDefined();
  });

  it('should provide Tenant repository', () => {
    const repo = module.get(getRepositoryToken(Tenant));
    expect(repo).toBeDefined();
    expect(repo.target).toBe(Tenant);
  });

  it('should provide User repository', () => {
    const repo = module.get(getRepositoryToken(User));
    expect(repo).toBeDefined();
    expect(repo.target).toBe(User);
  });

  it('should provide UserCredentials repository', () => {
    const repo = module.get(getRepositoryToken(UserCredentials));
    expect(repo).toBeDefined();
    expect(repo.target).toBe(UserCredentials);
  });

  it('should provide UserRoleAssignment repository', () => {
    const repo = module.get(getRepositoryToken(UserRoleAssignment));
    expect(repo).toBeDefined();
    expect(repo.target).toBe(UserRoleAssignment);
  });

  it('should provide DataSource for transactional queries', () => {
    const ds = module.get(getDataSourceToken());
    expect(ds).toBeDefined();
    expect(ds.createQueryRunner).toBeDefined();
  });
});
