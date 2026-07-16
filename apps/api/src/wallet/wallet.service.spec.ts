import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Horizon, Keypair } from '@stellar/stellar-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from './wallet.service';

jest.mock('@stellar/stellar-sdk');

describe('WalletService', () => {
  let service: WalletService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    wallet: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockHorizonServer = {
    accounts: jest.fn().mockReturnThis(),
    call: jest.fn(),
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

    // Mock Stellar SDK
    (Horizon.Server as jest.Mock).mockImplementation(
      () => mockHorizonServer,
    );
    (Keypair.random as jest.Mock).mockReturnValue({
      publicKey: jest.fn().mockReturnValue('GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'),
      secret: jest.fn().mockReturnValue('SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'),
    });
  });

  describe('createWallet', () => {
    it('should create a new wallet and persist to database', async () => {
      const userId = 'user-1';
      const keypair = {
        publicKey: jest.fn().mockReturnValue('GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'),
        secret: jest.fn().mockReturnValue('SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'),
      };

      (Keypair.random as jest.Mock).mockReturnValue(keypair);

      const createdWallet = {
        id: 'wallet-1',
        userId,
        publicKey: keypair.publicKey(),
        secretKey: keypair.secret(),
        name: 'Default Wallet',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.wallet.create.mockResolvedValue(createdWallet);

      const result = await service.createWallet(userId, 'Default Wallet');

      expect(mockPrismaService.wallet.create).toHaveBeenCalledWith({
        data: {
          userId,
          publicKey: keypair.publicKey(),
          secretKey: keypair.secret(),
          name: 'Default Wallet',
          isActive: true,
        },
      });
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

  describe('getBalances', () => {
    it('should fetch and return mapped balances from Horizon', async () => {
      const publicKey = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
      const accountData = {
        balances: [
          {
            balance: '100.5000000',
            asset_type: 'native',
            asset_code: 'XLM',
            asset_issuer: null,
          },
          {
            balance: '50.0000000',
            asset_type: 'credit_alphanum12',
            asset_code: 'USDC',
            asset_issuer: 'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQSXUSMIQ375YQJJWEL5QXZPP',
          },
        ],
      };

      mockHorizonServer.call.mockResolvedValue(accountData);

      const result = await service.getBalances(publicKey);

      expect(Horizon.Server).toHaveBeenCalledWith(
        'https://horizon-testnet.stellar.org',
      );
      expect(mockHorizonServer.accounts).toHaveBeenCalledWith(publicKey);
      expect(mockHorizonServer.call).toHaveBeenCalled();
      expect(result).toEqual(accountData.balances);
    });

    it('should return empty array if account has no balances', async () => {
      const publicKey = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

      mockHorizonServer.call.mockResolvedValue({ balances: [] });

      const result = await service.getBalances(publicKey);

      expect(result).toEqual([]);
    });

    it('should throw error if Horizon call fails', async () => {
      const publicKey = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
      const error = new Error('Horizon unavailable');

      mockHorizonServer.call.mockRejectedValue(error);

      await expect(service.getBalances(publicKey)).rejects.toThrow(error);
    });
  });

  describe('importWallet', () => {
    it('should import wallet with valid secret key and upsert to database', async () => {
      const userId = 'user-1';
      const secretKey = 'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
      const walletName = 'Imported Wallet';

      const keypair = {
        publicKey: jest.fn().mockReturnValue('GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'),
      };

      (Keypair.fromSecret as jest.Mock).mockReturnValue(keypair);

      const importedWallet = {
        id: 'wallet-2',
        userId,
        publicKey: keypair.publicKey(),
        secretKey,
        name: walletName,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.wallet.upsert.mockResolvedValue(importedWallet);

      const result = await service.importWallet(userId, secretKey, walletName);

      expect(Keypair.fromSecret).toHaveBeenCalledWith(secretKey);
      expect(mockPrismaService.wallet.upsert).toHaveBeenCalled();
      expect(result).toEqual(importedWallet);
    });

    it('should throw error for invalid secret key', async () => {
      const userId = 'user-1';
      const invalidSecretKey = 'INVALID_KEY';

      (Keypair.fromSecret as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid secret key');
      });

      await expect(
        service.importWallet(userId, invalidSecretKey, 'Wallet'),
      ).rejects.toThrow('Invalid secret key');
    });

    it('should update existing wallet on re-import', async () => {
      const userId = 'user-1';
      const secretKey = 'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
      const publicKey = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

      const keypair = {
        publicKey: jest.fn().mockReturnValue(publicKey),
      };

      (Keypair.fromSecret as jest.Mock).mockReturnValue(keypair);

      const updatedWallet = {
        id: 'wallet-existing',
        userId,
        publicKey,
        secretKey,
        name: 'Updated Import',
        isActive: true,
      };

      mockPrismaService.wallet.upsert.mockResolvedValue(updatedWallet);

      const result = await service.importWallet(
        userId,
        secretKey,
        'Updated Import',
      );

      expect(mockPrismaService.wallet.upsert).toHaveBeenCalled();
      expect(result.id).toBe('wallet-existing');
    });
  });

  describe('encryptDecrypt', () => {
    it('should encrypt secret key and return encrypted value', () => {
      const secretKey = 'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

      const encrypted = service.encryptSecretKey(secretKey);

      expect(encrypted).toBeTruthy();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(secretKey); // Should not be plaintext
    });

    it('should decrypt encrypted secret key back to original', () => {
      const originalKey = 'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

      const encrypted = service.encryptSecretKey(originalKey);
      const decrypted = service.decryptSecretKey(encrypted);

      expect(decrypted).toBe(originalKey);
    });

    it('should handle encryption round-trip for multiple keys', () => {
      const keys = [
        'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'SYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
        'SZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
      ];

      keys.forEach((key) => {
        const encrypted = service.encryptSecretKey(key);
        const decrypted = service.decryptSecretKey(encrypted);
        expect(decrypted).toBe(key);
      });
    });

    it('should throw error for invalid encrypted data', () => {
      const invalidEncrypted = 'invalid_encrypted_data_12345';

      expect(() => service.decryptSecretKey(invalidEncrypted)).toThrow();
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

      mockPrismaService.wallet.findMany = jest
        .fn()
        .mockResolvedValue(wallets);

      const result = await service.getUserWallets(userId);

      expect(mockPrismaService.wallet.findMany).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result).toEqual(wallets);
      expect(result).toHaveLength(2);
    });

    it('should return empty array if user has no wallets', async () => {
      const userId = 'user-no-wallets';

      mockPrismaService.wallet.findMany = jest.fn().mockResolvedValue([]);

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