const fs = require('fs')
const path = require('path')
const PDFDocument = require('pdfkit')

const Product = require('../models/product');
const Order = require('../models/order');
const { errorMonitor } = require('events');

const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
  let {page} = req.query 
  page = Number(page) || 1
  let totalItems

  Product.find()
  .countDocuments()
  .then(numProds => {
    totalItems = numProds
    return  Product
    .find()
    .skip((page - 1) * ITEMS_PER_PAGE )
    .limit(ITEMS_PER_PAGE)
  })

    .then(products => {
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'Products',
        path: '/products',
        currentPage : page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage : page > 1,
        nextPage: page + 1,
        previousPage : page - 1,
        lastPage : Math.ceil(totalItems / ITEMS_PER_PAGE )
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products'
      });
    })
    .catch(err => console.log(err));
};

exports.getIndex = (req, res, next) => {
  let {page} = req.query 
  page = Number(page) || 1
  let totalItems

  Product.find()
  .countDocuments()
  .then(numProds => {
    totalItems = numProds
    return  Product
    .find()
    .skip((page - 1) * ITEMS_PER_PAGE )
    .limit(ITEMS_PER_PAGE)
  })

    .then(products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
        currentPage : page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage : page > 1,
        nextPage: page + 1,
        previousPage : page - 1,
        lastPage : Math.ceil(totalItems / ITEMS_PER_PAGE )
      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products
      });
    })
    .catch(err => console.log(err));
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      
      res.redirect('/cart');
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => console.log(err));
};

exports.getCheckOut  = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      let total = 0
      products.forEach(p => {
          total += p.quantity * p.productId.price
      })
      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'Checkout',
        products: products,
        totalSum:total
      });
    })
    .catch(err => console.log(err));
}

exports.postOrder = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => console.log(err));
};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders
      });
    })
    .catch(err => console.log(err));
};


exports.getInvoice = (req, res, next) => {
  const {orderId} = req.params;
  Order.findById(orderId)
   .then(order => {
     if(!order) return next(new Error('No orders found'))
     if (order.user.userId.toString() !== req.user._id.toString()){
      return next(new Error('Unauthorized'))
     }
     const invoiceName = 'invoice-' + orderId + '.pdf'
     const invoicePath = path.join('data', 'invoices', invoiceName)

     const pdfDoc =  new PDFDocument();
     res.setHeader('Content-Type', 'application/pdf')
     res.setHeader('Content-Disposition','inline; filename="' +invoiceName + '"')

     pdfDoc.pipe(fs.createWriteStream(invoicePath))
     pdfDoc.pipe(res)

     pdfDoc.fontSize(26).text('Invoice',{
       underline:true
     })

     pdfDoc.text('--------------------------------------------')
     let totalPrice= 0
     order.products.forEach(prod => {
       totalPrice += prod.quantity * prod.product.price
       pdfDoc.fontSize(18).text(prod.product.title + ' - ' + prod.quantity + ' x ' + '$' + prod.product.price)
     })
     pdfDoc.text('Total Price: $' + totalPrice)

     pdfDoc.end()

    //  const data = fs.readFileSync(invoicePath)
    //  res.setHeader('Content-Type', 'application/pdf')
    //  res.setHeader('Content-Disposition','inline; filename="' +invoiceName + '"')
    //  res.send(data)

    // const file = fs.createReadStream(invoicePath)
    
   })
  //  file.pipe(res)
  
}
 