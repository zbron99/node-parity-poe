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

const POE = require('./');
const assert = require('assert');

describe('POE', function () {
  const inboundMessages = [
    {
      name: 'Enter Order',
      formatted: [
        0x45,
        0x66, 0x6f, 0x6f, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x42,
        0x42, 0x41, 0x52, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02,
      ],
      parsed: {
        messageType: POE.MessageType.ENTER_ORDER,
        orderId: 'foo             ',
        side: POE.Side.BUY,
        instrument: 'BAR     ',
        quantity: 1,
        price: 2,
      },
    },
    {
      name: 'Cancel Order',
      formatted: [
        0x58,
        0x66, 0x6f, 0x6f, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
      ],
      parsed: {
        messageType: POE.MessageType.CANCEL_ORDER,
        orderId: 'foo             ',
        quantity: 1,
      },
    },
  ];

  describe('#formatInbound()', function () {
    inboundMessages.forEach((message) => {
      it(`handles ${message.name} message`, function () {
        assert.deepEqual(POE.formatInbound(message.parsed), Buffer.from(message.formatted));
      });
    });

    it('handles unknown message type', function () {
      const message = {
        messageType: '?',
      };

      assert.throws(() => POE.formatInbound(message), /Unknown message type: \?/);
    });

    it('handles too short string', function () {
      const formatted = [
        0x58,
        0x66, 0x6f, 0x6f, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
      ];

      const parsed = {
        messageType: POE.MessageType.CANCEL_ORDER,
        orderId: 'foo',
        quantity: 1,
      };

      assert.deepEqual(POE.formatInbound(parsed), Buffer.from(formatted));
    });

    it('handles too long string', function () {
      const formatted = [
        0x58,
        0x66, 0x6f, 0x6f, 0x20, 0x62, 0x61, 0x72, 0x20, 0x62, 0x61, 0x7a, 0x20, 0x71, 0x75, 0x75, 0x78,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
      ];

      const parsed = {
        messageType: POE.MessageType.CANCEL_ORDER,
        orderId: 'foo bar baz quux xyzzy',
        quantity: 1,
      };

      assert.deepEqual(POE.formatInbound(parsed), Buffer.from(formatted));
    });
  });

  describe('#parseInbound()', function () {
    inboundMessages.forEach((message) => {
      it(`handles ${message.name} message`, function () {
        assert.deepEqual(POE.parseInbound(Buffer.from(message.formatted)), message.parsed);
      });
    });

    it('handles unknown message type', function () {
      const buffer = Buffer.from([ 0x3f ]);

      assert.throws(() => POE.parseInbound(buffer), /Unknown message type: 63/);
    });
  });

  const outboundMessages = [
    {
      name: 'Order Accepted',
      formatted: [
        0x41,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x02,
        0x66, 0x6f, 0x6f, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x42,
        0x42, 0x41, 0x52, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04,
        0x00, 0x00, 0x00, 0x05, 0x00, 0x00, 0x00, 0x06,
      ],
      parsed: {
        messageType: POE.MessageType.ORDER_ACCEPTED,
        timestamp: 4294967298,
        orderId: 'foo             ',
        side: POE.Side.BUY,
        instrument: 'BAR     ',
        quantity: 3,
        price: 4,
        orderNumber: 21474836486,
      },
    },
    {
      name: 'Order Rejected',
      formatted: [
        0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x02,
        0x66, 0x6f, 0x6f, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x49,
      ],
      parsed: {
        messageType: POE.MessageType.ORDER_REJECTED,
        timestamp: 4294967298,
        orderId: 'foo             ',
        reason: POE.OrderRejectReason.UNKNOWN_INSTRUMENT,
      },
    },
    {
      name: 'Order Executed',
      formatted: [
        0x45,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x02,
        0x66, 0x6f, 0x6f, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04,
        0x41,
        0x00, 0x00, 0x00, 0x05,
      ],
      parsed: {
        messageType: POE.MessageType.ORDER_EXECUTED,
        timestamp: 4294967298,
        orderId: 'foo             ',
        quantity: 3,
        price: 4,
        liquidityFlag: POE.LiquidityFlag.ADDED_LIQUIDITY,
        matchNumber: 5,
      },
    },
    {
      name: 'Order Canceled',
      formatted: [
        0x58,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x02,
        0x66, 0x6f, 0x6f, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03,
        0x52,
      ],
      parsed: {
        messageType: POE.MessageType.ORDER_CANCELED,
        timestamp: 4294967298,
        orderId: 'foo             ',
        canceledQuantity: 3,
        reason: POE.OrderCancelReason.REQUEST,
      },
    },
  ];

  describe('#formatOutbound()', function () {
    outboundMessages.forEach((message) => {
      it(`handles ${message.name} message`, function () {
        assert.deepEqual(POE.formatOutbound(message.parsed), Buffer.from(message.formatted));
      });
    });

    it('handles unknown message type', function () {
      const message = {
        messageType: '?',
      };

      assert.throws(() => POE.formatOutbound(message), /Unknown message type: \?/);
    });

    it('handles too short string', function () {
      const formatted = [
        0x58,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
        0x66, 0x6f, 0x6f, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02,
        0x52,
      ];

      const parsed = {
        messageType: 'X',
        timestamp: 1,
        orderId: 'foo',
        canceledQuantity: 2,
        reason: 'R',
      };

      assert.deepEqual(POE.formatOutbound(parsed), Buffer.from(formatted));
    });

    it('handles too long string', function () {
      const formatted = [
        0x58,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
        0x66, 0x6f, 0x6f, 0x20, 0x62, 0x61, 0x72, 0x20, 0x62, 0x61, 0x7a, 0x20, 0x71, 0x75, 0x75, 0x78,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02,
        0x52,
      ];

      const parsed = {
        messageType: 'X',
        timestamp: 1,
        orderId: 'foo bar baz quux xyzzy',
        canceledQuantity: 2,
        reason: 'R',
      };

      assert.deepEqual(POE.formatOutbound(parsed), Buffer.from(formatted));
    });
  });

  describe('#parseOutbound()', function () {
    outboundMessages.forEach((message) => {
      it(`handles ${message.name} message`, function () {
        assert.deepEqual(POE.parseOutbound(Buffer.from(message.formatted)), message.parsed);
      });
    });

    it('handles unknown message type', function () {
      const buffer = Buffer.from([ 0x3f ]);

      assert.throws(() => POE.parseOutbound(buffer), /Unknown message type: 63/);
    });
  });
});
