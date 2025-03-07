import type { ChangeEvent } from 'react'
import React, { Fragment, useEffect, useState } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { PageBlock, Table, Dropdown } from 'vtex.styleguide'
import { useQuery } from 'react-apollo'
import { useRuntime } from 'vtex.render-runtime'

// import type { CellRendererProps } from '../OrganizationDetails'
import { organizationMessages as messages } from '../utils/messages'
import { organizationBulkAction } from '../utils/organizationBulkAction'
import GET_ORGANIZATION from '../../graphql/getOrganization.graphql'
import GET_COLLECTIONS from '../../graphql/getCollections.graphql'
import GET_COST_CENTERS from '../../graphql/getCostCentersByOrganizationId.graphql'

export interface Collection {
  collectionId: string
  name: string
}

interface DropdownOption {
  value: string
  label: string
}


interface SelectedOrgCostCenterDetails {
  id: string
  orgId: string
  costId: string
  name: string
}

// interface CostCenterSimple {
//   id: string
//   name: string
//   addresses: Address[]
// }

const OrganizationDetailsCollections = ({
  getSchema,
  collectionsState,
  setCollectionsState,
}: {
  getSchema: (argument?: any) => any
  collectionsState: Collection[]
  setCollectionsState: (value: any) => void
}) => {
  /**
   * Hooks
   */
  const { formatMessage } = useIntl()

  const {
    // culture: { country },
    route: { params },
    // navigate,
  } = useRuntime()
  /**
   * States
   */

  const [collectionOptions, setCollectionOptions] = useState([] as Collection[])
  const [collectionPaginationState, setCollectionPaginationState] = useState({
    page: 1,
    pageSize: 25,
  })

  const [costOrgCenterState, setOrgCostCenterState] = useState({} as SelectedOrgCostCenterDetails)

  const [orgOptions, setOrgOptions] = useState(
    [] as DropdownOption[]
  )

  const [costCenterOptions, setCostCenterOptions] = useState(
    [] as DropdownOption[]
  )

  const [combinedOptions, setCombinedOptions] = useState([] as DropdownOption[]);

  // const [costCenterPaginationState, setCostCenterPaginationState] = useState({
  //   page: 1,
  //   pageSize: 25,
  // })

  /**
   * Queries
   */
  const { data: organizationData } = useQuery(
    GET_ORGANIZATION,{
    variables: { id: params?.id },
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
    skip: !params?.id,
    ssr: false,
    }
  )

  const {
    data: collectionsData,
    refetch: refetchCollections,
    loading,
  } = useQuery(GET_COLLECTIONS, {
    variables: collectionPaginationState,
    notifyOnNetworkStatusChange: true,
    ssr: false,
  })

  const {
    data: costCentersData,
    // refetch: refetchCostCenters,
    loading:costCenterLoading,
  } = useQuery(GET_COST_CENTERS, {
    // variables: { ...costCenterPaginationState, id: params?.id },
    variables: { id: params?.id },

    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
    skip: !params?.id,
    ssr: false,
  })

  /**
   * Effects
   */

  console.log("costCenterState", setOrgCostCenterState)
  console.log("collectionsData", collectionsData)
  console.log("orgOptions", orgOptions)

  useEffect(() => {
    if (!organizationData?.getOrganizationById) {
      return
    }

    const data = organizationData?.getOrganizationById
  
    const options = [{ label: data.name, value: data.id }]
  
    setOrgOptions([...options])
  }, [organizationData])

  useEffect(() => {
    if (!collectionsData?.collections?.items?.length) {
      return
    }

    const collections =
      collectionsData.collections.items.map((collection: any) => {
        return { name: collection.name, collectionId: collection.id }
      }) ?? []

    setCollectionOptions(collections)
  }, [collectionsData])

  useEffect(() => {
      if (
        !costCentersData?.getCostCentersByOrganizationId?.data?.length
      ) {
        return
      }
  
      const data = costCentersData.getCostCentersByOrganizationId.data
  
      const options = data.map((costCenter: any) => {
        return { label: costCenter.name + " - CC", value: costCenter.id }
      })
  
      setCostCenterOptions([...options])
    }, [costCentersData])

  useEffect(() => {
    setCombinedOptions([...orgOptions, ...costCenterOptions]);
  }, [orgOptions, costCenterOptions]);

  /**
   * Functions
   */
    // const getCostCenterSchema = () => ({
    //   properties: {
    //     name: {
    //       title: formatMessage(messages.detailsColumnName),
    //     },
    //     addresses: {
    //       title: formatMessage(messages.columnAddresses),
    //       cellRenderer: ({
    //         rowData: { addresses },
    //       }: CellRendererProps<CostCenterSimple>) => (
    //         <span>{addresses.length}</span>
    //       ),
    //     },
    //   },
    // })

  const handleRemoveCollections = (rowParams: any) => {
    const { selectedRows = [] } = rowParams
    const collectionsToRemove = [] as string[]

    selectedRows.forEach((row: any) => {
      collectionsToRemove.push(row.collectionId)
    })

    const newCollectionList = collectionsState.filter(
      collection => !collectionsToRemove.includes(collection.collectionId)
    )

    setCollectionsState(newCollectionList)
  }

  const handleCollectionsPrevClick = () => {
    if (collectionPaginationState.page === 1) return

    const newPage = collectionPaginationState.page - 1

    setCollectionPaginationState({
      ...collectionPaginationState,
      page: newPage,
    })

    refetchCollections({
      ...collectionPaginationState,
      page: newPage,
    })
  }

  const handleCollectionsNextClick = () => {
    const newPage = collectionPaginationState.page + 1

    setCollectionPaginationState({
      ...collectionPaginationState,
      page: newPage,
    })

    refetchCollections({
      ...collectionPaginationState,
      page: newPage,
    })
  }

  const handleRowsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const {
      target: { value },
    } = e

    setCollectionPaginationState({
      page: 1,
      pageSize: +value,
    })

    refetchCollections({
      page: 1,
      pageSize: +value,
    })
  }
  

  const handleAddCollections = (rowParams: any) => {
    const { selectedRows = [] } = rowParams
    const newCollections = [] as Collection[]

    selectedRows.forEach((row: any) => {
      if (
        !collectionsState.some(
          collection => collection.collectionId === row.collectionId
        )
      ) {
        newCollections.push({ name: row.name, collectionId: row.collectionId })
      }
    })

    setCollectionsState([...collectionsState, ...newCollections])
  }

  return (
    <Fragment>
      <PageBlock variation="half" title={formatMessage(messages.collections)}>
        <div>
          <h4 className="t-heading-4 mt0 mb0">
            <FormattedMessage id="admin/b2b-organizations.organization-details.assigned-to-org" />
          </h4>
          <div className="w-100 mv6">
            <Dropdown
              placeholder={"Choose Organization/Cost Center"}
              disabled={costCenterLoading}
              options={combinedOptions}
              value={costOrgCenterState.id}
              onChange={(_: any, v: string) =>
                setOrgCostCenterState({ ...costOrgCenterState, id: v })
              }
            />
          </div>
          <Table
            fullWidth
            schema={getSchema()}
            items={collectionsState}
            bulkActions={organizationBulkAction(
              handleRemoveCollections,
              messages.removeFromOrg,
              formatMessage
            )}
          />
        </div>
        <div>
          <h4 className="t-heading-4 mt0 mb0">
            <FormattedMessage id="admin/b2b-organizations.organization-details.available" />
          </h4>
          <div className="w-100 mv6">
            <Dropdown
              placeholder={"Choose Organization/Cost Center"}
              disabled={costCenterLoading}
              options={combinedOptions}
              value={costOrgCenterState.id}
              onChange={(_: any, v: string) =>
                setOrgCostCenterState({ ...costOrgCenterState, id: v })
              }
            />
          </div>
          <Table
            fullWidth
            schema={getSchema('availableCollections')}
            items={collectionOptions}
            loading={loading}
            pagination={{
              onNextClick: handleCollectionsNextClick,
              onPrevClick: handleCollectionsPrevClick,
              onRowsChange: handleRowsChange,
              selectedOption: collectionPaginationState.pageSize,
              currentItemFrom:
                (collectionPaginationState.page - 1) *
                  collectionPaginationState.pageSize +
                1,
              currentItemTo:
                collectionsData?.collections?.paging?.total <
                collectionPaginationState.page *
                  collectionPaginationState.pageSize
                  ? collectionsData?.collections?.paging?.total
                  : collectionPaginationState.page *
                    collectionPaginationState.pageSize,
              textShowRows: formatMessage(messages.showRows),
              textOf: formatMessage(messages.of),
              totalItems: collectionsData?.collections?.paging?.total ?? 0,
              rowsOptions: [25, 50],
            }}
            bulkActions={organizationBulkAction(
              handleAddCollections,
              {
                id: `Add to orgs`,
              },
              formatMessage
            )}
          />
        </div>
      </PageBlock>
    </Fragment>
  )
}

export default OrganizationDetailsCollections
