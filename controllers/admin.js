const {validationResult} = require('express-validator')

const Product = require('../models/product');
const fileHelper = require('../util/file')

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError:false,
    errorMessage:null,
    validationErrors : []
    
  });
};

exports.postAddProduct = (req, res, next) => {
  const{title,price,description}  = req.body;
  const image = req.file
 
  
  if(!image){
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError:true,
      product: {
        title,
        price,
        description
      },
      errorMessage:'Attached file is not an image',
      validationErrors:[]
     
    });
  }
 
   const errors = validationResult(req)
   if(!errors.isEmpty()){
   return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError:true,
      product: {
        title,
        price,
        description
      },
      errorMessage:errors.array()[0].msg,
      validationErrors:errors.array()
     
    });
   }
 
   const imageUrl = image.path
   
  const product = new Product({
    title,
    price,
    description,
    imageUrl,
    userId: req.user
  });
  product
    .save()
    .then(result => {
      // console.log(result);
      console.log('Created Product');
      res.redirect('/admin/products');
    })
    .catch(err => {
      console.log(err);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        hasError:false,
        errorMessage:null,
        validationErrors:[]
       
      });
    })
    .catch(err => console.log(err));
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;
  const errors = validationResult(req)
  if(!errors.isEmpty()){
  return res.status(422).render('admin/edit-product', {
     pageTitle: 'Edit Product',
     path: '/admin/edit-product',
     editing: true,
     hasError:true,
     product: {
       title : updatedTitle ,
       price : updatedPrice,
       description : updatedDesc,
       _id:prodId
     },
     errorMessage:errors.array()[0].msg,
     validationErrors:errors.array()

    
   });
  }

  Product.findById(prodId)
    .then(product => {
      if(product.userId.toString() !== req.user._id.toString()){
       return res.redirect('/')
      }
      
        product.title = updatedTitle;
        product.price = updatedPrice;
        product.description = updatedDesc;
        if(image) {
          fileHelper.deleteFile(product.imageUrl)
          product.imageUrl = image.path;

        }
        return product.save()
        .then(result => {
          console.log('UPDATED PRODUCT!');
          res.redirect('/admin/products');
        })
      
      
    })
   
    .catch(err => console.log(err));
};

exports.getProducts = (req, res, next) => {
  Product.find({userId: req.user._id})

    .then(products => {
    
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
        
      });
    })
    .catch(err => console.log(err));
};

exports.deleteProduct = (req, res, next) => {
  const {productId} = req.params;
  Product.findById(productId)
  .then(product => {
    if(!product){
      return nex(new Error('Product not found'))
    }
    fileHelper.deleteFile(product.imageUrl)
    return Product.deleteOne({_id : productId, userId:req.user._id})
  })
    .then(() => {
      console.log('DESTROYED PRODUCT');
      res.json({message:'succes'});
    })
    .catch(err => res.status(500).json({message:'Deleting product failed'}));
};
