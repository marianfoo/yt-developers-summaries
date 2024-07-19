
import BaseController from "./BaseController";
import Filter from "sap/ui/model/Filter";
import { Input$LiveChangeEvent } from "sap/m/Input";
import Table from "sap/m/Table";
import { Select$ChangeEvent } from "sap/m/Select";
import Sorter from "sap/ui/model/Sorter";
import FilterOperator from "sap/ui/model/FilterOperator";
import JSONListBinding from "sap/ui/model/json/JSONListBinding";

/**
 * @namespace com.marianzeis.controller
 */
export default class Main extends BaseController {

    onSearch(event: Input$LiveChangeEvent): void {
        const query = event.getSource().getValue();
        const table = this.byId("videoTable") as Table;
        const binding = table.getBinding("items") as JSONListBinding;
        const filters = [];

        if (query) {
            filters.push(new Filter({
                filters: [
                    new Filter("title", FilterOperator.Contains, query),
                    new Filter("summary", FilterOperator.Contains, query)
                ],
                and: false
            }));
        }

        binding.filter(filters);
    }

    onSort(event: Select$ChangeEvent): void {
        const key = event.getSource().getSelectedKey();
        const table = this.byId("videoTable") as Table;
        const binding = table.getBinding("items") as JSONListBinding;
        const descending = (key === "viewCount");

        const sorter = new Sorter(key, descending);
        binding.sort(sorter);
    }
}
