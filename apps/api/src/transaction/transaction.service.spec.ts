import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionService } from './transaction.service';

jest.mock('bullmq');

describe('TransactionService', () => {
  let service: TransactionService;
  let prismaService: PrismaService;
  let transactionQueue: Queue;

  const mockPrismaService = {
    transaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    wallet: {
      findUnique: jest.fn(),
    },
  };

  const mockQueue = {
    add: jest.fn(),
    process: jest.fn(),
    getJob: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: 'BullQueue_transactions',
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    prismaService = module.get<PrismaService>(PrismaService);
    transactionQueue = module.get<Queue>('BullQueue_transactions');
  });

  describe('sendTransfer', () => {
    it('should create transaction record and enqueue job', async () => {
      const sendTransferDto = {
        fromWalletId: 'wallet-1',
        toAddress: 'GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
        amount: '100.00',
        assetCode: 'XLM',
        memo: 'Transfer memo',
      };

      const createdTransaction = {
        id: 'tx-1',
        ...sendTransferDto,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        publicKey: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      });

      mockPrismaService.transaction.create.mockResolvedValue(
        createdTransaction,
      );
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      const result = await service.sendTransfer(sendTransferDto);

      expect(mockPrismaService.wallet.findUnique).toHaveBeenCalledWith({
        where: { id: sendTransferDto.fromWalletId },
      });
      expect(mockPrismaService.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fromWalletId: sendTransferDto.fromWalletId,
          toAddress: sendTransferDto.toAddress,
          amount: parseFloat(sendTransferDto.amount),
          assetCode: sendTransferDto.assetCode,
          status: 'PENDING',
        }),
      });
      expect(mockQueue.add).toHaveBeenCalledWith('process-transfer', {
        transactionId: createdTransaction.id,
      });
      expect(result).toEqual(createdTransaction);
    });

    it('should throw error if wallet does not exist', async () => {
      const sendTransferDto = {
        fromWalletId: 'nonexistent-wallet',
        toAddress: 'GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
        amount: '100.00',
        assetCode: 'XLM',
        memo: 'Transfer',
      };

      mockPrismaService.wallet.findUnique.mockResolvedValue(null);

      await expect(service.sendTransfer(sendTransferDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.transaction.create).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should throw error for invalid amount', async () => {
      const sendTransferDto = {
        fromWalletId: 'wallet-1',
        toAddress: 'GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
        amount: '-100.00',
        assetCode: 'XLM',
        memo: 'Transfer',
      };

      await expect(service.sendTransfer(sendTransferDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for invalid destination address', async () => {
      const sendTransferDto = {
        fromWalletId: 'wallet-1',
        toAddress: 'INVALID_ADDRESS',
        amount: '100.00',
        assetCode: 'XLM',
        memo: 'Transfer',
      };

      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
      });

      await expect(service.sendTransfer(sendTransferDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getTransactionHistory', () => {
    it('should return latest 50 transactions for wallet', async () => {
      const walletId = 'wallet-1';
      const transactions = Array.from({ length: 25 }, (_, i) => ({
        id: `tx-${i}`,
        fromWalletId: walletId,
        toAddress: 'GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
        amount: (i + 1) * 10,
        assetCode: 'XLM',
        status: i % 2 === 0 ? 'SUCCESS' : 'PENDING',
        createdAt: new Date(Date.now() - i * 1000 * 60),
        updatedAt: new Date(Date.now() - i * 1000 * 60),
      }));

      mockPrismaService.transaction.findMany.mockResolvedValue(transactions);

      const result = await service.getTransactionHistory(walletId);

      expect(mockPrismaService.transaction.findMany).toHaveBeenCalledWith({
        where: { fromWalletId: walletId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      expect(result).toEqual(transactions);
      expect(result).toHaveLength(25);
    });

    it('should return empty array if wallet has no transactions', async () => {
      const walletId = 'wallet-no-transactions';

      mockPrismaService.transaction.findMany.mockResolvedValue([]);

      const result = await service.getTransactionHistory(walletId);

      expect(result).toEqual([]);
    });

    it('should support pagination with limit and offset', async () => {
      const walletId = 'wallet-1';
      const limit = 25;
      const offset = 25;

      const transactions = Array.from({ length: 10 }, (_, i) => ({
        id: `tx-${i + offset}`,
        fromWalletId: walletId,
      }));

      mockPrismaService.transaction.findMany.mockResolvedValue(transactions);

      const result = await service.getTransactionHistory(walletId, limit, offset);

      expect(mockPrismaService.transaction.findMany).toHaveBeenCalledWith({
        where: { fromWalletId: walletId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });
      expect(result).toHaveLength(10);
    });

    it('should return transactions in descending order by creation', async () => {
      const walletId = 'wallet-1';
      const now = new Date();

      const transactions = [
        {
          id: 'tx-3',
          createdAt: new Date(now.getTime() - 1000 * 60),
        },
        {
          id: 'tx-2',
          createdAt: new Date(now.getTime() - 1000 * 120),
        },
        {
          id: 'tx-1',
          createdAt: new Date(now.getTime() - 1000 * 180),
        },
      ];

      mockPrismaService.transaction.findMany.mockResolvedValue(transactions);

      const result = await service.getTransactionHistory(walletId);

      expect(result[0].id).toBe('tx-3'); // Most recent
      expect(result[1].id).toBe('tx-2');
      expect(result[2].id).toBe('tx-1'); // Oldest
    });
  });

  describe('getTransaction', () => {
    it('should return transaction by id', async () => {
      const transactionId = 'tx-1';
      const transaction = {
        id: transactionId,
        fromWalletId: 'wallet-1',
        toAddress: 'GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
        amount: 100.0,
        status: 'SUCCESS',
        createdAt: new Date(),
      };

      mockPrismaService.transaction.findUnique.mockResolvedValue(transaction);

      const result = await service.getTransaction(transactionId);

      expect(mockPrismaService.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: transactionId },
      });
      expect(result).toEqual(transaction);
    });

    it('should throw NotFoundException if transaction not found', async () => {
      const transactionId = 'nonexistent-tx';

      mockPrismaService.transaction.findUnique.mockResolvedValue(null);

      await expect(service.getTransaction(transactionId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateTransactionStatus', () => {
    it('should update transaction status', async () => {
      const transactionId = 'tx-1';
      const newStatus = 'SUCCESS';

      const updatedTransaction = {
        id: transactionId,
        status: newStatus,
        updatedAt: new Date(),
      };

      mockPrismaService.transaction.update.mockResolvedValue(
        updatedTransaction,
      );

      const result = await service.updateTransactionStatus(
        transactionId,
        newStatus,
      );

      expect(mockPrismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: transactionId },
        data: { status: newStatus },
      });
      expect(result.status).toBe(newStatus);
    });

    it('should support adding transaction hash on success', async () => {
      const transactionId = 'tx-1';
      const txHash = 'abc123def456';

      mockPrismaService.transaction.update.mockResolvedValue({
        id: transactionId,
        txHash,
        status: 'SUCCESS',
      });

      const result = await service.updateTransactionStatus(
        transactionId,
        'SUCCESS',
        txHash,
      );

      expect(mockPrismaService.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: transactionId },
          data: expect.objectContaining({
            status: 'SUCCESS',
            txHash,
          }),
        }),
      );
    });
  });

  describe('cancelTransaction', () => {
    it('should cancel pending transaction', async () => {
      const transactionId = 'tx-1';

      mockPrismaService.transaction.findUnique.mockResolvedValue({
        id: transactionId,
        status: 'PENDING',
      });
      mockPrismaService.transaction.update.mockResolvedValue({
        id: transactionId,
        status: 'CANCELLED',
      });

      const result = await service.cancelTransaction(transactionId);

      expect(mockPrismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: transactionId },
        data: { status: 'CANCELLED' },
      });
      expect(result.status).toBe('CANCELLED');
    });

    it('should throw error if trying to cancel non-pending transaction', async () => {
      const transactionId = 'tx-1';

      mockPrismaService.transaction.findUnique.mockResolvedValue({
        id: transactionId,
        status: 'SUCCESS',
      });

      await expect(service.cancelTransaction(transactionId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.transaction.update).not.toHaveBeenCalled();
    });
  });
});