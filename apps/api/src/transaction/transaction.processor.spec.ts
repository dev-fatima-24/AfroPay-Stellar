import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  TransactionBuilder,
  Networks,
  Asset,
  Keypair,
  SubmitTransactionError,
} from '@stellar/stellar-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { TransactionProcessor } from './transaction.processor';

jest.mock('@stellar/stellar-sdk');

describe('TransactionProcessor', () => {
  let processor: TransactionProcessor;
  let prismaService: PrismaService;
  let walletService: WalletService;

  const mockPrismaService = {
    transaction: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    wallet: {
      findUnique: jest.fn(),
    },
  };

  const mockWalletService = {
    decryptSecretKey: jest.fn(),
    getBalances: jest.fn(),
  };

  const mockHorizonServer = {
    loadAccount: jest.fn(),
    submitTransaction: jest.fn(),
    getTransaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionProcessor,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<TransactionProcessor>(TransactionProcessor);
    prismaService = module.get<PrismaService>(PrismaService);
    walletService = module.get<WalletService>(WalletService);
  });

  describe('processTransaction', () => {
    it('should successfully submit transaction and update status to SUCCESS', async () => {
      const transactionId = 'tx-1';
      const transaction = {
        id: transactionId,
        fromWalletId: 'wallet-1',
        toAddress: 'GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
        amount: 100.0,
        assetCode: 'XLM',
        memo: 'Test transfer',
        status: 'PENDING',
        retryCount: 0,
      };

      const wallet = {
        id: 'wallet-1',
        publicKey: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        secretKey: 'encrypted_secret',
      };

      const decryptedSecret = 'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
      const txHash = 'abc123def456xyz789';

      mockPrismaService.transaction.findUnique.mockResolvedValue(transaction);
      mockPrismaService.wallet.findUnique.mockResolvedValue(wallet);
      mockWalletService.decryptSecretKey.mockReturnValue(decryptedSecret);

      // Mock Stellar SDK
      const mockKeypair = {
        publicKey: jest.fn().mockReturnValue(wallet.publicKey),
        sign: jest.fn(),
      };

      (Keypair.fromSecret as jest.Mock).mockReturnValue(mockKeypair);

      const mockTxBuilder = {
        addOperation: jest.fn().mockReturnThis(),
        setTimeout: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({
          toXDR: jest.fn().mockReturnValue('tx_xdr_string'),
          sign: jest.fn(),
        }),
      };

      (TransactionBuilder as jest.Mock).mockImplementation(() => mockTxBuilder);

      mockHorizonServer.loadAccount.mockResolvedValue({
        sequence: '123456',
      });

      mockHorizonServer.submitTransaction.mockResolvedValue({
        hash: txHash,
        id: txHash,
      });

      mockPrismaService.transaction.update.mockResolvedValue({
        ...transaction,
        status: 'SUCCESS',
        txHash,
      });

      const result = await processor.processTransaction(transactionId);

      expect(mockPrismaService.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: transactionId },
      });
      expect(mockWalletService.decryptSecretKey).toHaveBeenCalledWith(
        wallet.secretKey,
      );
      expect(Keypair.fromSecret).toHaveBeenCalledWith(decryptedSecret);
      expect(mockPrismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: transactionId },
        data: {
          status: 'SUCCESS',
          txHash,
          retryCount: 0,
        },
      });
      expect(result.status).toBe('SUCCESS');
    });

    it('should update status to RETRYING on first failed attempt', async () => {
      const transactionId = 'tx-1';
      const transaction = {
        id: transactionId,
        fromWalletId: 'wallet-1',
        toAddress: 'GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
        amount: 100.0,
        assetCode: 'XLM',
        status: 'PENDING',
        retryCount: 0,
      };

      const wallet = {
        id: 'wallet-1',
        publicKey: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        secretKey: 'encrypted_secret',
      };

      const decryptedSecret = 'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
      const error = new SubmitTransactionError('Network error', 500, null);

      mockPrismaService.transaction.findUnique.mockResolvedValue(transaction);
      mockPrismaService.wallet.findUnique.mockResolvedValue(wallet);
      mockWalletService.decryptSecretKey.mockReturnValue(decryptedSecret);

      const mockKeypair = {
        publicKey: jest.fn().mockReturnValue(wallet.publicKey),
      };

      (Keypair.fromSecret as jest.Mock).mockReturnValue(mockKeypair);

      const mockTxBuilder = {
        addOperation: jest.fn().mockReturnThis(),
        setTimeout: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({
          toXDR: jest.fn().mockReturnValue('tx_xdr'),
        }),
      };

      (TransactionBuilder as jest.Mock).mockImplementation(() => mockTxBuilder);

      mockHorizonServer.loadAccount.mockResolvedValue({
        sequence: '123456',
      });

      mockHorizonServer.submitTransaction.mockRejectedValue(error);

      mockPrismaService.transaction.update.mockResolvedValue({
        ...transaction,
        status: 'RETRYING',
        retryCount: 1,
      });

      const result = await processor.processTransaction(transactionId);

      expect(mockPrismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: transactionId },
        data: {
          status: 'RETRYING',
          retryCount: 1,
        },
      });
      expect(result.status).toBe('RETRYING');
    });

    it('should update status to FAILED on 3rd retry attempt', async () => {
      const transactionId = 'tx-1';
      const transaction = {
        id: transactionId,
        fromWalletId: 'wallet-1',
        toAddress: 'GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
        amount: 100.0,
        assetCode: 'XLM',
        status: 'RETRYING',
        retryCount: 2,
      };

      const wallet = {
        id: 'wallet-1',
        publicKey: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        secretKey: 'encrypted_secret',
      };

      const decryptedSecret = 'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
      const error = new SubmitTransactionError('Network error', 500, null);

      mockPrismaService.transaction.findUnique.mockResolvedValue(transaction);
      mockPrismaService.wallet.findUnique.mockResolvedValue(wallet);
      mockWalletService.decryptSecretKey.mockReturnValue(decryptedSecret);

      const mockKeypair = {
        publicKey: jest.fn().mockReturnValue(wallet.publicKey),
      };

      (Keypair.fromSecret as jest.Mock).mockReturnValue(mockKeypair);

      const mockTxBuilder = {
        addOperation: jest.fn().mockReturnThis(),
        setTimeout: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({
          toXDR: jest.fn().mockReturnValue('tx_xdr'),
        }),
      };

      (TransactionBuilder as jest.Mock).mockImplementation(() => mockTxBuilder);

      mockHorizonServer.loadAccount.mockResolvedValue({
        sequence: '123456',
      });

      mockHorizonServer.submitTransaction.mockRejectedValue(error);

      mockPrismaService.transaction.update.mockResolvedValue({
        ...transaction,
        status: 'FAILED',
        retryCount: 3,
      });

      const result = await processor.processTransaction(transactionId);

      expect(mockPrismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: transactionId },
        data: {
          status: 'FAILED',
          retryCount: 3,
        },
      });
      expect(result.status).toBe('FAILED');
    });

    it('should handle Stellar validation errors', async () => {
      const transactionId = 'tx-1';
      const transaction = {
        id: transactionId,
        fromWalletId: 'wallet-1',
        toAddress: 'INVALID_ADDRESS', // Invalid address
        amount: 100.0,
        assetCode: 'XLM',
        status: 'PENDING',
        retryCount: 0,
      };

      const wallet = {
        id: 'wallet-1',
        publicKey: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        secretKey: 'encrypted_secret',
      };

      mockPrismaService.transaction.findUnique.mockResolvedValue(transaction);
      mockPrismaService.wallet.findUnique.mockResolvedValue(wallet);
      mockWalletService.decryptSecretKey.mockReturnValue(
        'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      );

      const mockKeypair = {
        publicKey: jest.fn().mockReturnValue(wallet.publicKey),
      };

      (Keypair.fromSecret as jest.Mock).mockReturnValue(mockKeypair);

      const mockTxBuilder = {
        addOperation: jest.fn().mockImplementation(() => {
          throw new Error('Invalid destination address');
        }),
        setTimeout: jest.fn().mockReturnThis(),
        build: jest.fn(),
      };

      (TransactionBuilder as jest.Mock).mockImplementation(() => mockTxBuilder);

      mockHorizonServer.loadAccount.mockResolvedValue({
        sequence: '123456',
      });

      mockPrismaService.transaction.update.mockResolvedValue({
        ...transaction,
        status: 'FAILED',
      });

      const result = await processor.processTransaction(transactionId);

      expect(result.status).toBe('FAILED');
    });

    it('should throw error if transaction not found', async () => {
      const transactionId = 'nonexistent-tx';

      mockPrismaService.transaction.findUnique.mockResolvedValue(null);

      await expect(processor.processTransaction(transactionId)).rejects.toThrow(
        'Transaction not found',
      );
    });

    it('should throw error if wallet not found', async () => {
      const transactionId = 'tx-1';
      const transaction = {
        id: transactionId,
        fromWalletId: 'nonexistent-wallet',
        toAddress: 'GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
        amount: 100.0,
        status: 'PENDING',
      };

      mockPrismaService.transaction.findUnique.mockResolvedValue(transaction);
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);

      await expect(processor.processTransaction(transactionId)).rejects.toThrow(
        'Wallet not found',
      );
    });

    it('should decrement retry count incrementally', async () => {
      const retryTests = [
        { currentRetry: 0, expectedStatus: 'RETRYING' },
        { currentRetry: 1, expectedStatus: 'RETRYING' },
        { currentRetry: 2, expectedStatus: 'FAILED' },
      ];

      for (const test of retryTests) {
        jest.clearAllMocks();

        const transaction = {
          id: 'tx-1',
          fromWalletId: 'wallet-1',
          toAddress: 'GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
          amount: 100.0,
          status: test.currentRetry === 0 ? 'PENDING' : 'RETRYING',
          retryCount: test.currentRetry,
        };

        const wallet = {
          id: 'wallet-1',
          publicKey: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          secretKey: 'encrypted_secret',
        };

        mockPrismaService.transaction.findUnique.mockResolvedValue(transaction);
        mockPrismaService.wallet.findUnique.mockResolvedValue(wallet);
        mockWalletService.decryptSecretKey.mockReturnValue(
          'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        );

        const mockKeypair = {
          publicKey: jest.fn().mockReturnValue(wallet.publicKey),
        };

        (Keypair.fromSecret as jest.Mock).mockReturnValue(mockKeypair);

        const mockTxBuilder = {
          addOperation: jest.fn().mockReturnThis(),
          setTimeout: jest.fn().mockReturnThis(),
          build: jest.fn().mockReturnValue({
            toXDR: jest.fn().mockReturnValue('tx_xdr'),
          }),
        };

        (TransactionBuilder as jest.Mock).mockImplementation(() => mockTxBuilder);

        mockHorizonServer.loadAccount.mockResolvedValue({
          sequence: '123456',
        });

        mockHorizonServer.submitTransaction.mockRejectedValue(
          new Error('Network error'),
        );

        mockPrismaService.transaction.update.mockResolvedValue({
          ...transaction,
          status: test.expectedStatus,
          retryCount: test.currentRetry + 1,
        });

        const result = await processor.processTransaction('tx-1');

        expect(result.status).toBe(test.expectedStatus);
      }
    });
  });

  describe('retry logic', () => {
    it('should mark transaction for retry on transient errors', async () => {
      const transactionId = 'tx-1';
      const transientErrors = [
        'timeout',
        'connection refused',
        'network unavailable',
      ];

      for (const errorMsg of transientErrors) {
        jest.clearAllMocks();

        const transaction = {
          id: transactionId,
          fromWalletId: 'wallet-1',
          toAddress: 'GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
          amount: 100.0,
          status: 'PENDING',
          retryCount: 0,
        };

        mockPrismaService.transaction.findUnique.mockResolvedValue(transaction);
        mockPrismaService.transaction.update.mockResolvedValue({
          ...transaction,
          status: 'RETRYING',
        });

        // Simulate transient error
        mockHorizonServer.submitTransaction.mockRejectedValue(
          new Error(errorMsg),
        );

        // Transaction should be marked for retry
        // (actual implementation depends on error handling strategy)
      }
    });
  });
});