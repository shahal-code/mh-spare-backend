import * as AddressService from "../../services/user/addressService.js";
import { validateAddressData } from "../../utils/validation.js";

export const load_address = async (req, res) => {
    try {
        const userId = req.user._id;
        const addresses = await AddressService.getAddressesByUserId(userId);
        res.json({ success: true, addresses });
    } catch (error) {
        console.error("Error loading addresses:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const load_addAddress = async (req, res) => {
    res.json({ success: true, message: "Ready to add address" });
};

export const addAddress = async (req, res) => {
    try {
        const errors = validateAddressData(req.body);
        if (errors) {
            return res.status(400).json({ success: false, message: "Validation error", errors });
        }
        const address = await AddressService.addAddress(req.user._id, req.body);
        res.status(201).json({ success: true, message: "Address added successfully", address });
    } catch (error) {
        console.error("Error adding address:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const load_editAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const address = await AddressService.getAddressById(id);
        if (!address) return res.status(404).json({ success: false, message: "Address not found" });
        res.json({ success: true, address });
    } catch (error) {
        console.error("Error loading edit address:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const editAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const errors = validateAddressData(req.body);
        if (errors) {
            return res.status(400).json({ success: false, message: "Validation error", errors });
        }
        const address = await AddressService.updateAddress(id, req.user._id, req.body);
        res.json({ success: true, message: "Address updated successfully", address });
    } catch (error) {
        console.error("Error editing address:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;
        await AddressService.deleteAddress(id);
        res.json({ success: true, message: "Address deleted successfully" });
    } catch (error) {
        console.error("Error deleting address:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const setDefaultAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        await AddressService.setDefaultAddress(userId, id);
        res.json({ success: true, message: "Default address updated" });
    } catch (error) {
        console.error("Error setting default address:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
