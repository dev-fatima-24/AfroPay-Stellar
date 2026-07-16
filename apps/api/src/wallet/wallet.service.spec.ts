import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from './wallet.service';

describe('WalletService', () => {
  let service: WalletService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    wallet: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('createWallet', () => {
    it('should create a new wallet and persist to database', async () => {
      const userId = 'user-1';
      const createdWallet = {
        id: 'wallet-1',
        userId,
        publicKey: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        secretKey: 'encrypted_secret',
        name: 'Default Wallet',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.wallet.create.mockResolvedValue(createdWallet);

      const result = await service.createWallet(userId, 'Default Wallet');

      expect(mockPrismaService.wallet.create).toHaveBeenCalled();
      expect(result).toEqual(createdWallet);
    });

    it('should throw error if wallet creation fails', async () => {
      const userId = 'user-1';

      mockPrismaService.wallet.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.createWallet(userId, 'Wallet')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('getUserWallets', () => {
    it('should return all wallets for a user', async () => {
      const userId = 'user-1';
      const wallets = [
        {
          id: 'wallet-1',
          userId,
          publicKey: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          secretKey: 'encrypted_secret_1',
          name: 'Primary',
          isActive: true,
        },
        {
          id: 'wallet-2',
          userId,
          publicKey: 'GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
          secretKey: 'encrypted_secret_2',
          name: 'Secondary',
          isActive: false,
        },
      ];

      mockPrismaService.wallet.findMany.mockResolvedValue(wallets);

      const result = await service.getUserWallets(userId);

      expect(mockPrismaService.wallet.findMany).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result).toEqual(wallets);
      expect(result).toHaveLength(2);
    });

    it('should return empty array if user has no wallets', async () => {
      const userId = 'user-no-wallets';

      mockPrismaService.wallet.findMany.mockResolvedValue([]);

      const result = await service.getUserWallets(userId);

      expect(result).toEqual([]);
    });
  });

  describe('deleteWallet', () => {
    it('should delete wallet by id', async () => {
      const walletId = 'wallet-1';

      mockPrismaService.wallet.delete.mockResolvedValue({
        id: walletId,
        deleted: true,
      });

      const result = await service.deleteWallet(walletId);

      expect(mockPrismaService.wallet.delete).toHaveBeenCalledWith({
        where: { id: walletId },
      });
      expect(result.deleted).toBe(true);
    });

    it('should throw NotFoundException if wallet does not exist', async () => {
      const walletId = 'nonexistent-wallet';

      mockPrismaService.wallet.delete.mockRejectedValue(
        new NotFoundException('Wallet not found'),
      );

      await expect(service.deleteWallet(walletId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
