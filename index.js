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

const BigNumber = require('bignumber.js');
BigNumber.config({
  EXPONENTIAL_AT: 9
});

const MessageType = {
  ENTER_ORDER: 'E',
  CANCEL_ORDER: 'X',
  ORDER_ACCEPTED: 'A',
  ORDER_REJECTED: 'R',
  ORDER_EXECUTED: 'E',
  ORDER_CANCELED: 'X',
};

const Factor = {
  SIZE: Math.pow(10, 8),
  PRICE: Math.pow(10, 8),
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

exports.format = (message) => {
  switch (message.messageType) {
    case MessageType.ENTER_ORDER:
      return formatEnterOrder(message);
    case MessageType.CANCEL_ORDER:
      return formatCancelOrder(message);
    default:
      throw new Error('Unknown message type: ' + message.messageType);
  }
};

exports.parse = (buffer) => {
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

function formatOrderType(type) {
  const format = {
    Limit: 'L',
    Market: 'M',
    Stop: 'S',
  };
  return format[type];
}

function parseOrderType(type) {
  const parse = {
    L: 'Limit',
    M: 'Market',
    S: 'Stop',
  };
  return parse[type];
}

function formatOrderSide(side) {
  const format = {
    buy: 'B',
    sell: 'S',
  };
  return format[side];
}

function parseOrderSide(side) {
  const parse = {
    B: 'buy',
    S: 'sell',
  };
  return parse[side];
}

function formatOrderQuantity(quantity) {
  return new BigNumber(quantity).times(Factor.SIZE).toNumber();
}

function parseOrderQuantity(quantity) {
  return new BigNumber(quantity).dividedBy(Factor.SIZE).toString();
}

function formatOrderPrice(price) {
  return new BigNumber(price).times(Factor.PRICE).toNumber();
}

function parseOrderPrice(price) {
  return new BigNumber(price).dividedBy(Factor.PRICE).toString();
}

function formatEnterOrder(message) {
  switch (message.type) {
    case 'Limit':
      return formatEnterLimitOrder(message);
    case 'Market': 
      return formatEnterMarketOrder(message);
    case 'Stop':
      return formatEnterStopOrder(message);
  }
}

function formatEnterLimitOrder(message) {
  const buffer = Buffer.allocUnsafe(63);

  // messageType 'E' - Enter Order
  buffer.writeUInt8(0x45, 0);
  writeString(buffer, message.orderId, 1, 36);
  writeString(buffer, formatOrderType(message.type), 37, 1);
  writeString(buffer, formatOrderSide(message.side), 38, 1);
  writeString(buffer, message.instrument, 39, 8);
  writeUInt64BE(buffer, formatOrderQuantity(message.quantity), 47);
  writeUInt64BE(buffer, formatOrderPrice(message.price), 55);

  return buffer;
}

function formatEnterMarketOrder(message) {
  const buffer = Buffer.allocUnsafe(63);

  // messageType 'E' - Enter Order
  buffer.writeUInt8(0x45, 0);
  writeString(buffer, message.orderId, 1, 36);
  writeString(buffer, formatOrderType(message.type), 37, 1);
  writeString(buffer, formatOrderSide(message.side), 38, 1);
  writeString(buffer, message.instrument, 39, 8);
  writeUInt64BE(buffer, formatOrderQuantity(message.quantity), 47);
  writeUInt64BE(buffer, formatOrderPrice(message.limit), 55);

  return buffer;
}

function formatEnterStopOrder(message) {
  const buffer = Buffer.allocUnsafe(71);

  // messageType 'E' - Enter Order
  buffer.writeUInt8(0x45, 0);
  writeString(buffer, message.orderId, 1, 36);
  writeString(buffer, formatOrderType(message.type), 37, 1);
  writeString(buffer, formatOrderSide(message.side), 38, 1);
  writeString(buffer, message.instrument, 39, 8);
  writeUInt64BE(buffer, formatOrderQuantity(message.quantity), 47);
  writeUInt64BE(buffer, formatOrderPrice(message.price), 55);
  writeUInt64BE(buffer, formatOrderPrice(message.limit), 63);

  return buffer;
}

function formatCancelOrder(message) {
  const buffer = Buffer.allocUnsafe(45);

  buffer.writeUInt8(0x58, 0);
  writeString(buffer, message.orderId, 1, 36);
  writeUInt64BE(buffer, formatOrderQuantity(message.quantity), 37);

  return buffer;
}

function parseOrderAccepted(buffer) {
  const type = parseOrderType(readString(buffer, 45, 1));
  const parse = {
    messageType: MessageType.ORDER_ACCEPTED,
    timestamp: readUInt64BE(buffer, 1),
    orderId: readString(buffer, 9, 36),
    type,
    side: parseOrderSide(readString(buffer, 46, 1)),
    instrument: readString(buffer, 47, 8).trim(),
    quantity: parseOrderQuantity(readUInt64BE(buffer, 55)),
    orderNumber: readUInt64BE(buffer, 63),
  };
  switch (type) {
    case 'Market':
      parse.limit = parseOrderQuantity(readUInt64BE(buffer, 71));
      break;
    case 'Limit':
      parse.price = parseOrderPrice(readUInt64BE(buffer, 71));
      break;
    case 'Stop':
      parse.price = parseOrderPrice(readUInt64BE(buffer, 71));
      parse.limit = parseOrderQuantity(readUInt64BE(buffer, 79));
      break;
  }
  return parse;
}

function parseOrderRejected(buffer) {
  return {
    messageType: MessageType.ORDER_REJECTED,
    timestamp: readUInt64BE(buffer, 1),
    orderId: readString(buffer, 9, 36),
    reason: readString(buffer, 45, 1),
  };
}

function parseOrderExecuted(buffer) {
  return {
    messageType: MessageType.ORDER_EXECUTED,
    timestamp: readUInt64BE(buffer, 1),
    orderId: readString(buffer, 9, 36),
    quantity: parseOrderQuantity(readUInt64BE(buffer, 45)),
    price: parseOrderPrice(readUInt64BE(buffer, 53)),
    liquidityFlag: readString(buffer, 61, 1),
    matchNumber: buffer.readUInt32BE(62),
  };
}

function parseOrderCanceled(buffer) {
  return {
    messageType: MessageType.ORDER_CANCELED,
    timestamp: readUInt64BE(buffer, 1),
    orderId: readString(buffer, 9, 36),
    canceledQuantity: parseOrderQuantity(readUInt64BE(buffer, 45)),
    reason: readString(buffer, 53, 1),
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