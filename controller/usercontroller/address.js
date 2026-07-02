import * as AddressService from "../../services/user/addressService.js";
import * as ProfileService from "../../services/user/profileService.js";
import { validateAddressData } from "../../utils/validation.js";

export const load_address = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await ProfileService.getProfile(userId);
        const addresses = await AddressService.getAddressesByUserId(userId);
        res.render("user/address/address", { 
            user,
             addresses,
            path: "/user/address"
         });
    } catch (error) {
        console.error("Error loading addresses:", error.message);
        res.status(500).send("Internal Server Error");
    }
};

export const load_addAddress = async (req, res) => {
    try {
        const user = await ProfileService.getProfile(req.session.user);
        const errors = req.session.validationErrors || null;
        const formData = req.session.formData || null;
        delete req.session.validationErrors;
        delete req.session.formData;
        res.render("user/address/addNewAddress", { user, errors, formData,req });
    } catch (error) {
        console.error("Error loading add address page:", error.message);
        res.status(500).send("Internal Server Error");
    }
};

export const addAddress = async (req, res) => {
    try {
        const from=req.query.from;
        const errors = validateAddressData(req.body);
        if (errors) {
            req.session.validationErrors = errors;
            req.session.formData = req.body;

            return res.redirect(from==="checkout"
                ?"/user/address/add?from=checkout"
                :"/user/address/add"
            );
        }
        await AddressService.addAddress(req.session.user, req.body);
        if(from==="checkout"){
            return res.redirect("/user/checkout");
        }
        res.redirect("/user/address");
    } catch (error) {
        console.error("Error adding address:", error.message);
        res.status(500).send("Internal Server Error");
    }
};

export const load_editAddress = async (req, res) => {
    try {
      const { id } = req.params;
        // validate id
        if (!id) {
            return res.redirect("/user/address");
        }
        const address = await AddressService.getAddressById(id);
        // address not found
        if (!address) {
            return res.redirect("/user/address");
        }
        const user = await ProfileService.getProfile(req.session.user);
        const errors = req.session.validationErrors || null;
        const formData = req.session.formData || null;
        delete req.session.validationErrors;
        delete req.session.formData;
        res.render("user/address/editAddress", { address, user, errors, formData, req });
    } catch (error) {
        console.error("Error loading edit address page:", error.message);
        res.status(500).send("Internal Server Error");
    }
};

export const editAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const from=req.query.from;
        const errors = validateAddressData(req.body);
        if (errors) {
            req.session.validationErrors = errors;
            req.session.formData = req.body;
            return res.redirect(from==="checkout"
                ?`/user/address/edit/${id}?from=checkout`
                :`/user/address/edit/${id}`
            )
        }
        await AddressService.updateAddress(id, req.session.user, req.body);
        if(from==="checkout"){
            return res.redirect("/user/checkout")
        }
        res.redirect("/user/address");
    } catch (error) {
        console.error("Error editing address:", error.message);
        res.status(500).send("Internal Server Error");
    }
};

export const deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;
        await AddressService.deleteAddress(id);
        res.redirect("/user/address");
    } catch (error) {
        console.error("Error deleting address:", error.message);
        res.status(500).send("Internal Server Error");
    }
};

export const setDefaultAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user;
        await AddressService.setDefaultAddress(userId, id);
        res.redirect("/user/address");
    } catch (error) {
        console.error("Error setting default address:", error.message);
        res.status(500).send("Internal Server Error");
    }
};
