const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next))
            .catch((error) => next(error))
    }
}

export { asyncHandler }


// function asyncHandler(requestHandler) {

//     return function (req, res, next) {
//         Promise.resolve(requestHandler(req, res, next))
//             .catch(function (err) {
//                 next(err);
//             });
//     };
// }

//asyncHandler() doesn't execute your controller immediately. It wraps your controller inside another 
// function and returns that function. Later, when a request comes, Express executes the wrapper, 
//and the wrapper executes your controller while automatically catching any errors.



// const asyncHandler = (fn) => async (req, res, next) => {
//     try{
//         await asyncHandler(req, res , next)
//     }catch(error){
//         req.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }


// function asyncHandler(fn) { // asyncHandler = fn

//     return async function (req, res, next) {
//         try {
//             await fn(req, res, next);
//         } catch (error) {
//             res.status(error.code || 500).json({
//                 success: false,
//                 message: error.message
//             });
//         }
//     };
// }



// function asyncHandler(requestHandler) {

//     return function (req, res, next) {
//         Promise.resolve(requestHandler(req, res, next))
//             .catch(function (err) {
//                 next(err);
//             });
//     };
// }
