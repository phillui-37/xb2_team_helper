import { useEffect, useState } from "react";
import DriverCheckBox, { type TDriver } from "../components/DriverCheckBox";
import ElementCheckBox, { type TElement } from "../components/ElementCheckBox";
import WeaponCheckBox, { TWeapon } from "../components/WeaponCheckBox";
import { Button } from "@mui/material";
import DB from "../../model/db";

declare type TFlags = {
    driver: Record<TDriver, boolean>
    element: Record<TElement, boolean>
    weapon: Record<TWeapon, boolean>
}

const db = DB.getInstance()

/**
 * member to set criteria
 * not need to set criteria of elements and effects
 * 
 * must select 3 member to start cal
 */

export default function MainPage() {
    const [flags, setFlags] = useState<TFlags>({} as any)

    const getFlagSetter = (field: keyof TFlags) => (data: TFlags[typeof field]) => setFlags(ori => ({ ...ori, [field]: data }))

    useEffect(() => {
        console.log(flags)
    }, [flags])

    const trySql = () => {
        db.getFixedBladeByDriver('tora')
            .then(row => console.log(row))
            .catch(err => console.error(err))
    }

    return <div className="flex items-center flex-col p-4 max-w-full w-screen">
        <DriverCheckBox onChange={getFlagSetter('driver')} />
        <ElementCheckBox onChange={getFlagSetter('element')} />
        <WeaponCheckBox onChange={getFlagSetter('weapon')} />
        <Button variant="outlined" onClick={trySql}>SQL</Button>
    </div>
}