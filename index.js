/*
 * Copyright 2017 Parity authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const MessageType = {
  ENTER_ORDER: 'E',
  CANCEL_ORDER: 'X',
  ORDER_ACCEPTED: 'A',
  ORDER_REJECTED: 'R',
  ORDER_EXECUTED: 'E',
  ORDER_CANCELED: 'X',
};

exports.MessageType = MessageType;

exports.Side = {
  BUY: 'B',
  SELL: 'S',
};

exports.OrderRejectReason = {
  UNKNOWN_INSTRUMENT: 'I',
  INVALID_TYPE: 'T',
  INVALID_PRICE: 'P',
  INVALID_QUANTITY: 'Q',
};

exports.LiquidityFlag = {
  ADDED_LIQUIDITY: 'A',
  REMOVED_LIQUIDITY: 'R',
};

exports.OrderCancelReason = {
  REQUEST: 'R',
  SUPERVISORY: 'S',
};

exports.formatInbound = (message) => {
  switch (message.messageType) {
    case MessageType.ENTER_ORDER:
      return formatEnterOrder(message);
    case MessageType.CANCEL_ORDER:
      return formatCancelOrder(message);
    default:
      throw new Error('Unknown message type: ' + message.messageType);
  }
};

exports.parseInbound = (buffer) => {
  const messageType = buffer.readUInt8(0);

  switch (messageType) {
    case 0x45:
      return parseEnterOrder(buffer);
    case 0x58:
      return parseCancelOrder(buffer);
    default:
      throw new Error('Unknown message type: ' + messageType);
  }
};

function formatEnterOrder(message) {
  const buffer = Buffer.allocUnsafe(63);

  // messageType 'E' - Enter Order
  buffer.writeUInt8(0x45, 0);
  writeString(buffer, message.orderId, 1, 36);
  writeString(buffer, message.type, 37, 1);
  writeString(buffer, message.side, 38, 1);
  writeString(buffer, message.instrument, 39, 8);
  writeUInt64BE(buffer, message.quantity, 47);
  writeUInt64BE(buffer, message.price, 55);

  return buffer;
}

function parseEnterOrder(buffer) {
  return {
    messageType: MessageType.ENTER_ORDER,
    orderId: readString(buffer, 1, 16),
    side: readString(buffer, 17, 1),
    instrument: readString(buffer, 18, 8),
    quantity: readUInt64BE(buffer, 26),
    price: readUInt64BE(buffer, 34),
  };
}

function formatCancelOrder(message) {
  const buffer = Buffer.allocUnsafe(45);

  buffer.writeUInt8(0x58, 0);
  writeString(buffer, message.orderId, 1, 36);
  writeUInt64BE(buffer, message.quantity, 37);

  return buffer;
}

function parseCancelOrder(buffer) {
  return {
    messageType: MessageType.CANCEL_ORDER,
    orderId: readString(buffer, 1, 16),
    quantity: readUInt64BE(buffer, 17),
  };
}

exports.formatOutbound = (message) => {
  switch (message.messageType) {
    case MessageType.ORDER_ACCEPTED:
      return formatOrderAccepted(message);
    case MessageType.ORDER_REJECTED:
      return formatOrderRejected(message);
    case MessageType.ORDER_EXECUTED:
      return formatOrderExecuted(message);
    case MessageType.ORDER_CANCELED:
      return formatOrderCanceled(message);
    default:
      throw new Error('Unknown message type: ' + message.messageType);
  }
};

exports.parseOutbound = (buffer) => {
  const messageType = buffer.readUInt8(0);

  switch (messageType) {
    case 0x41:
      return parseOrderAccepted(buffer);
    case 0x52:
      return parseOrderRejected(buffer);
    case 0x45:
      return parseOrderExecuted(buffer);
    case 0x58:
      return parseOrderCanceled(buffer);
    default:
      throw new Error('Unknown message type: ' + messageType);
  }
};

function formatOrderAccepted(message) {
  const buffer = Buffer.allocUnsafe(58);

  buffer.writeUInt8(0x41, 0);
  writeUInt64BE(buffer, message.timestamp, 1);
  writeString(buffer, message.orderId, 9, 16);
  writeString(buffer, message.side, 25, 1);
  writeString(buffer, message.instrument, 26, 8);
  writeUInt64BE(buffer, message.quantity, 34);
  writeUInt64BE(buffer, message.price, 42);
  writeUInt64BE(buffer, message.orderNumber, 50);

  return buffer;
}

function parseOrderAccepted(buffer) {
  return {
    messageType: MessageType.ORDER_ACCEPTED,
    timestamp: readUInt64BE(buffer, 1),
    orderId: readString(buffer, 9, 36),
    type: readString(buffer, 45, 1),
    side: readString(buffer, 46, 1),
    instrument: readString(buffer, 47, 8),
    quantity: readUInt64BE(buffer, 55),
    price: readUInt64BE(buffer, 63),
    orderNumber: readUInt64BE(buffer, 71),
  };
}

function formatOrderRejected(message) {
  const buffer = Buffer.allocUnsafe(26);

  buffer.writeUInt8(0x52, 0);
  writeUInt64BE(buffer, message.timestamp, 1);
  writeString(buffer, message.orderId, 9, 16);
  writeString(buffer, message.reason, 25, 1);

  return buffer;
}

function parseOrderRejected(buffer) {
  return {
    messageType: MessageType.ORDER_REJECTED,
    timestamp: readUInt64BE(buffer, 1),
    orderId: readString(buffer, 9, 16),
    reason: readString(buffer, 25, 1),
  };
}

function formatOrderExecuted(message) {
  const buffer = Buffer.allocUnsafe(46);

  buffer.writeUInt8(0x45, 0);
  writeUInt64BE(buffer, message.timestamp, 1);
  writeString(buffer, message.orderId, 9, 16);
  writeUInt64BE(buffer, message.quantity, 25);
  writeUInt64BE(buffer, message.price, 33);
  writeString(buffer, message.liquidityFlag, 41, 1);
  buffer.writeUInt32BE(message.matchNumber, 42);

  return buffer;
}

function parseOrderExecuted(buffer) {
  return {
    messageType: MessageType.ORDER_EXECUTED,
    timestamp: readUInt64BE(buffer, 1),
    orderId: readString(buffer, 9, 36),
    quantity: readUInt64BE(buffer, 45),
    price: readUInt64BE(buffer, 53),
    liquidityFlag: readString(buffer, 61, 1),
    matchNumber: buffer.readUInt32BE(62),
  };
}

function formatOrderCanceled(message) {
  const buffer = Buffer.allocUnsafe(54);

  buffer.writeUInt8(0x58, 0);
  writeUInt64BE(buffer, message.timestamp, 1);
  writeString(buffer, message.orderId, 9, 36);
  writeUInt64BE(buffer, message.canceledQuantity, 45);
  writeString(buffer, message.reason, 53, 1);

  return buffer;
}

function parseOrderCanceled(buffer) {
  return {
    messageType: MessageType.ORDER_CANCELED,
    timestamp: readUInt64BE(buffer, 1),
    orderId: readString(buffer, 9, 16),
    canceledQuantity: readUInt64BE(buffer, 25),
    reason: readString(buffer, 33, 1),
  };
}

function writeUInt64BE(buffer, value, offset) {
  buffer.writeUInt32BE(value / 0x100000000, offset);
  buffer.writeUInt32BE(value % 0x100000000, offset + 4);
}

function readUInt64BE(buffer, offset) {
  const high = buffer.readUInt32BE(offset);
  const low = buffer.readUInt32BE(offset + 4);

  return 0x100000000 * high + low;
}

function writeString(buffer, value, offset, length) {
  const count = buffer.write(value, offset, length, 'ascii');

  buffer.fill(0x20, offset + count, offset + length);
}

function readString(buffer, offset, length) {
  return buffer.toString('ascii', offset, offset + length);
}